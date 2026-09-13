/**
 * Development-only photo data. Delete this file once the backend returns
 * real photo records — nothing else depends on the URLs below.
 */

export type Photo = {
  id: string;
  key: string;
  name: string;
  url: string;
  uploadedAt: string;
};

export const MOCK_PHOTOS: Photo[] = [
  {
    id: "1",
    key: "photos/mock-user/coast-road.jpg",
    name: "coast-road.jpg",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-10T08:12:00Z",
  },
  {
    id: "2",
    key: "photos/mock-user/kitchen-light.jpg",
    name: "kitchen-light.jpg",
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-09T17:40:00Z",
  },
  {
    id: "3",
    key: "photos/mock-user/harbour.jpg",
    name: "harbour.jpg",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-08T11:05:00Z",
  },
  {
    id: "4",
    key: "photos/mock-user/desk-notes.jpg",
    name: "desk-notes.jpg",
    url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-07T09:25:00Z",
  },
  {
    id: "5",
    key: "photos/mock-user/forest-walk.jpg",
    name: "forest-walk.jpg",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-06T14:50:00Z",
  },
  {
    id: "6",
    key: "photos/mock-user/city-dusk.jpg",
    name: "city-dusk.jpg",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-05T19:15:00Z",
  },
  {
    id: "7",
    key: "photos/mock-user/breakfast.jpg",
    name: "breakfast.jpg",
    url: "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-04T07:30:00Z",
  },
  {
    id: "8",
    key: "photos/mock-user/mountain-lake.jpg",
    name: "mountain-lake.jpg",
    url: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-03T16:00:00Z",
  },
  {
    id: "9",
    key: "photos/mock-user/street-market.jpg",
    name: "street-market.jpg",
    url: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-02T12:20:00Z",
  },
  {
    id: "10",
    key: "photos/mock-user/window-cat.jpg",
    name: "window-cat.jpg",
    url: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=800&q=70",
    uploadedAt: "2026-09-01T10:00:00Z",
  },
];
