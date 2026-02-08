import { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Comment } from '../../types';

interface CommentsPanelProps {
    workflowId: string;
    nodeId: string | null;
    nodeLabel: string;
    onClose: () => void;
    readOnly: boolean; // if true, can only view, no add
}

export const CommentsPanel = ({ workflowId, nodeId, nodeLabel, onClose, readOnly }: CommentsPanelProps) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchComments = async () => {
        if (!nodeId || !workflowId) return;

        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                user:user_id (
                    full_name
                )
            `)
            .eq('workflow_id', workflowId)
            .eq('node_id', nodeId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
        } else {
            // Map the joined user data to user_name for display
            const mappedComments = data.map((c: any) => ({
                ...c,
                user_name: c.user?.full_name || 'Unknown User'
            }));
            setComments(mappedComments);
            scrollToBottom();
        }
    };

    useEffect(() => {
        fetchComments();

        // Subscription for real-time updates
        const channel = supabase
            .channel(`comments:${workflowId}:${nodeId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'comments',
                    filter: `workflow_id=eq.${workflowId} AND node_id=eq.${nodeId}`
                },
                () => {
                    // Fetch to get user details properly
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workflowId, nodeId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user || !nodeId) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('comments')
                .insert({
                    workflow_id: workflowId,
                    node_id: nodeId,
                    user_id: user.id,
                    content: newComment.trim(),
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            setNewComment('');
        } catch (err) {
            console.error('Error sending comment:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!nodeId) return null;

    return (
        <div className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-xl border-l border-gray-200 flex flex-col z-20">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                    <h3 className="font-bold text-gray-900">Comments</h3>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]" title={nodeLabel}>
                        Re: {nodeLabel}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-200 rounded-full transition text-gray-400 hover:text-gray-600"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {comments.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8 italic">
                        No comments yet on this task.
                    </div>
                ) : (
                    comments.map((comment) => {
                        const isMe = comment.user_id === user?.id;
                        return (
                            <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${isMe
                                    ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-100'
                                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                    }`}>
                                    <p>{comment.content}</p>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 px-1">
                                    {!isMe && <span className="text-[10px] font-bold text-gray-600">{comment.user_name}</span>}
                                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                        {/* <Clock size={8} /> */}
                                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!readOnly && (
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <form onSubmit={handleSend} className="relative">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type a comment..."
                            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none text-sm min-h-[50px] max-h-[120px]"
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || loading}
                            className="absolute right-2 bottom-2.5 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:bg-gray-300 shadow-sm"
                        >
                            {loading ? (
                                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </form>
                    <p className="text-[10px] text-center text-gray-400 mt-2">
                        Enter to send, Shift+Enter for new line
                    </p>
                </div>
            )}
            {readOnly && (
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-500">
                    Read-only mode.
                </div>
            )}
        </div>
    );
};
