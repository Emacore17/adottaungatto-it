export const messageParticipantRoleValues = ['owner', 'requester'] as const;

export type MessageParticipantRole = (typeof messageParticipantRoleValues)[number];

export interface MessageParticipantSummary {
  role: MessageParticipantRole;
  email: string;
  providerSubject: string;
}

export interface MessageSummary {
  id: string;
  threadId: string;
  senderRole: MessageParticipantRole;
  senderEmail: string;
  body: string;
  createdAt: string;
}

export interface MessageThreadSummary {
  id: string;
  listingId: string;
  listingTitle: string;
  listingStatus: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  latestMessageAt: string;
  unreadCount: number;
  viewerRole: MessageParticipantRole;
  otherParticipant: MessageParticipantSummary;
  latestMessage: MessageSummary | null;
}

export interface MessageThreadDetail extends MessageThreadSummary {
  messages: MessageSummary[];
}

export interface MessageThreadsPage {
  threads: MessageThreadSummary[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  unreadMessages: number;
}

export interface CreateMessageThreadInput {
  listingId: string;
  requesterUserId: string;
  ownerUserId: string;
  listingTitle: string;
  source: string;
}

export interface CreateThreadMessageInput {
  threadId: string;
  senderUserId: string;
  body: string;
  messageHash: string;
}
