export interface Wedding {
  id: string;
  userId: string;
  partner1: string;
  partner2: string;
  date?: string;
  budget?: number;
  location?: string;
}

export interface Guest {
  id: string;
  weddingId: string;
  name: string;
  email?: string;
  status: 'invited' | 'confirmed' | 'declined';
  group?: string;
  plusOne?: boolean;
  attendeesCount?: number;
  dietaryRestrictions?: string;
  message?: string;
}

export interface Task {
  id: string;
  weddingId: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  order: number;
  timeframe?: string;
}

export interface BudgetItem {
  id: string;
  weddingId: string;
  category: string;
  name: string;
  estimated: number;
  paid: number;
}

export interface Payment {
  id: string;
  weddingId: string;
  budgetItemId: string;
  itemName: string;
  amount: number;
  date: string;
  method?: string;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface WeddingWebsite {
  id: string;
  weddingId: string;
  userId?: string; // Added for security rules
  templateId: string;
  welcomeTitle: string;
  welcomeMessage: string;
  invitationText: string;
  published: boolean;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    backgroundImage?: string;
  };
  sections: {
    id: string;
    type: 'welcome' | 'date-location' | 'invitation' | 'rsvp' | 'gallery' | 'story';
    title: string;
    content: string;
    order: number;
    visible: boolean;
  }[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'admin';
}
