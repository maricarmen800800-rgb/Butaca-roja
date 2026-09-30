import { MOVIES } from './catalog';
import type { Movie, Profile } from './types';

const weightForRating: Record<number, number> = { 5: 3, 4: 2, 3: 0.35, 2: -1, 1: -2.5 };

function add(map: Record<string, number>, key: string, value: number) {
  map[key] = (map[key] || 0) + value;
}

export function affinities(profile: Profile) {
  const director: Record<string, number> = {};
  const actor: Record<string, number> = {};
  const genre: Record<string, number> = {};
  const tag: Record<string, number> = {};
  const decade: Record<string, number> = {};
  const country: Record<string, number> = {};

  for (const movie of MOVIES) {
    const rating = profile.ratings[movie.id];
    if (!rating) continue;
    const w = weightForRating[rating] ?? 0;
    add(director, movie.director, w);
    movie.actors.forEach(a => add(actor, a, w * 0.7));
    movie.genres.forEach(g => add(genre, g, w * 0.8));
    movie.tags.forEach(t => add(tag, t, w * 0.65));
    add(decade, String(Math.floor(movie.year / 10) * 10), w * 0.4);
    add(country, movie.country, w * 0.4);
  }

  Object.entries(profile.actorRatings).forEach(([key,value]) => add(actor,key,(weightForRating[value] ?? 0) * 1.2));
  Object.entries(profile.directorRatings).forEach(([key,value]) => add(director,key,(weightForRating[value] ?? 0) * 1.5));

  return { director, actor, genre, tag, decade, country };
}

export function scoreMovie(movie: Movie, profile: Profile) {
  const a = affinities(profile);
  const avg = (values: number[]) => values.length ? values.reduce((x,y)=>x+y,0)/values.length : 0;
  let score = 0;
  score += (a.director[movie.director] || 0) * 3;
  score += avg(movie.actors.map(x => a.actor[x] || 0)) * 1.6;
  score += avg(movie.genres.map(x => a.genre[x] || 0)) * 1.5;
  score += avg(movie.tags.map(x => a.tag[x] || 0)) * 1.2;
  score += (a.decade[String(Math.floor(movie.year / 10) * 10)] || 0) * 0.7;
  score += (a.country[movie.country] || 0) * 0.7;
  score += (movie.popularity - 80) * 0.03;
  const recentIndex = profile.recommendationHistory.indexOf(movie.id);
  if (recentIndex >= 0) score -= Math.max(0.3, 1.5 - recentIndex * 0.08);
  return score;
}

export function reasonFor(movie: Movie, profile: Profile) {
  const a = affinities(profile);
  if ((a.director[movie.director] || 0) > 1.5) return 'Has valorado muy bien el cine de ' + movie.director + '.';
  const bestActor = movie.actors.map(name => ({name,score:a.actor[name] || 0})).sort((x,y)=>y.score-x.score)[0];
  if (bestActor && bestActor.score > 1.4) return bestActor.name + ' suele encajar contigo.';
  const bestGenre = movie.genres.map(name => ({name,score:a.genre[name] || 0})).sort((x,y)=>y.score-x.score)[0];
  if (bestGenre && bestGenre.score > 1.2) return 'Coincide con tu gusto por ' + bestGenre.name.toLowerCase() + '.';
  const bestTag = movie.tags.map(name => ({name,score:a.tag[name] || 0})).sort((x,y)=>y.score-x.score)[0];
  if (bestTag && bestTag.score > 1) return 'Tiene ese tono ' + bestTag.name + ' que estás valorando bien.';
  const evidence = Object.keys(profile.ratings).length + Object.keys(profile.actorRatings).length + Object.keys(profile.directorRatings).length;
  return evidence < 5 ? 'Una película importante para empezar a conocerte mejor.' : 'Una propuesta algo distinta para ampliar tu mapa de gustos.';
}

export function recommend(profile: Profile, limit = 10) {
  const excluded = new Set([...profile.rejected, ...profile.watched]);
  return MOVIES
    .filter(movie => !excluded.has(movie.id))
    .map(movie => ({ movie, score: scoreMovie(movie, profile) + Math.random() * 0.8, reason: reasonFor(movie, profile) }))
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit);
}