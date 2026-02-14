import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Comment } from '../../types';

interface CommentsPanelProps {
    workflowId: string | null;
    nodeId: string | null;
    readOnly: boolean; // if true, can only view, no add
}

export const CommentsPanel = ({ workflowId, nodeId, readOnly }: CommentsPanelProps) => {
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

        const { data, error } = await (supabase
            .from('comments') as any)
            .select('*')
            .eq('workflow_id', workflowId)
            .eq('node_id', nodeId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
        } else {
            setComments(data || []);
            scrollToBottom();
        }
    };

    useEffect(() => {
        fetchComments();

        // Subscription for real-time updates
        const channel = supabase
            .channel(`comments:${nodeId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'comments',
                    filter: `node_id=eq.${nodeId}`
                },
                (payload) => {
                    // Verify it belongs to this workflow
                    if (payload.new.workflow_id === workflowId) {
                        fetchComments();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workflowId, nodeId]);

    const { profile } = useAuth(); // Destructure profile from useAuth

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user || !nodeId || !workflowId) return;

        setLoading(true);
        try {
            const { error } = await (supabase
                .from('comments') as any)
                .insert({
                    workflow_id: workflowId,
                    node_id: nodeId,
                    user_id: user.id,
                    user_name: profile?.full_name || user.email,
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
        <div className="flex flex-col h-full bg-white">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <div className="p-4 border-t border-gray-100 bg-gray-50 mt-auto">
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
                            disabled={!newComment.trim() || loading || !workflowId}
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
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-500 mt-auto">
                    Read-only mode.
                </div>
            )}
        </div>
    );
};
