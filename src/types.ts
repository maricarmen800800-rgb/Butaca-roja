export type Movie = {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  runtime: number;
  country: string;
  language: string;
  director: string;
  actors: string[];
  genres: string[];
  tags: string[];
  synopsis: string;
  popularity: number;
};

export type DirectorInfo = {
  name: string;
  country: string;
  oneLiner: string;
  style: string;
  themes: string;
};

export type Profile = {
  ratings: Record<string, number>;
  watched: string[];
  watchlist: string[];
  favorites: string[];
  rewatch: string[];
  abandoned: string[];
  rejected: string[];
  actorRatings: Record<string, number>;
  directorRatings: Record<string, number>;
  recommendationHistory: string[];
};

export const emptyProfile: Profile = {
  ratings: {},
  watched: [],
  watchlist: [],
  favorites: [],
  rewatch: [],
  abandoned: [],
  rejected: [],
  actorRatings: {},
  directorRatings: {},
  recommendationHistory: [],
};