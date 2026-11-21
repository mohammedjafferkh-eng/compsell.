export function messageRecipient(conversation: { buyer_id: string; seller_id: string }, sender: string): string | null {
  if (conversation.buyer_id === sender) return conversation.seller_id === sender ? null : conversation.seller_id;
  if (conversation.seller_id === sender) return conversation.buyer_id;
  return null;
}

export function stalePushToken(status: number, body: string): boolean {
  return (status === 404 && body.includes('UNREGISTERED')) ||
    (status === 400 && body.includes('INVALID_ARGUMENT'));
}