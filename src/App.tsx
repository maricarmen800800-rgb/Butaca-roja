import { useEffect, useMemo, useState } from 'react';
import { ACTORS, DIRECTORS, MOVIES } from './catalog';
import { emptyProfile, type Movie, type Profile } from './types';
import { loadProfile, saveProfile } from './storage';
import { reasonFor, recommend } from './recommender';
import { Clapperboard, Heart, Search, Sparkles, Star, Ticket, UserRound, Video } from 'lucide-react';

type View = 'home' | 'movies' | 'actors' | 'directors' | 'for-you' | 'mine';
type Detail = { type:'movie'; id:string } | { type:'actor'; id:string } | { type:'director'; id:string } | null;

const cloneEmpty = () => JSON.parse(JSON.stringify(emptyProfile)) as Profile;

function Poster({movie, onClick, compact=false}:{movie:Movie; onClick?:()=>void; compact?:boolean}) {
  const hue = Math.abs(movie.title.split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % 360;
  return (
    <button className={'poster ' + (compact ? 'poster-compact' : '')} style={{'--posterHue': hue} as React.CSSProperties} onClick={onClick}>
      <div className="poster-grain" />
      <div className="poster-year">{movie.year}</div>
      <div className="poster-title">{movie.title}</div>
      <div className="poster-director">{movie.director}</div>
    </button>
  );
}

function RatingButtons({value,onRate,small=false}:{value?:number;onRate:(n:number)=>void;small?:boolean}) {
  const labels = [{n:5,t:'Me encanta',e:'♥'},{n:4,t:'Me gusta',e:'★'},{n:3,t:'Normal',e:'●'},{n:2,t:'No me convence',e:'–'},{n:1,t:'No me gusta',e:'×'}];
  return <div className={'rating-row ' + (small?'small':'')}>{labels.map(x=>
    <button key={x.n} className={value===x.n?'active':''} onClick={()=>onRate(x.n)} title={x.t}><span>{x.e}</span>{!small && x.t}</button>
  )}</div>;
}

export default function App() {
  const [profile,setProfile] = useState<Profile>(cloneEmpty);
  const [loaded,setLoaded] = useState(false);
  const [view,setView] = useState<View>('home');
  const [detail,setDetail] = useState<Detail>(null);
  const [curtainOpen,setCurtainOpen] = useState(false);
  const [query,setQuery] = useState('');
  const [recommendationIndex,setRecommendationIndex] = useState(0);

  useEffect(()=>{ loadProfile().then(p=>{setProfile(p);setLoaded(true);}); },[]);
  useEffect(()=>{ if(loaded) void saveProfile(profile); },[profile,loaded]);

  const recommendations = useMemo(()=>recommend(profile,12),[profile]);
  const featured = recommendations[recommendationIndex % Math.max(1,recommendations.length)]?.movie ?? MOVIES[0];

  const mutate = (fn:(p:Profile)=>Profile) => setProfile(prev=>fn(structuredClone(prev)));

  const rateMovie = (movie:Movie,n:number) => mutate(p=>{
    p.ratings[movie.id]=n;
    if(!p.watched.includes(movie.id)) p.watched.push(movie.id);
    p.watchlist=p.watchlist.filter(x=>x!==movie.id);
    p.rejected=p.rejected.filter(x=>x!==movie.id);
    p.recommendationHistory=[movie.id,...p.recommendationHistory.filter(x=>x!==movie.id)].slice(0,40);
    return p;
  });

  const toggleList = (key:'watched'|'watchlist'|'favorites'|'rewatch'|'abandoned'|'rejected', id:string) => mutate(p=>{
    const list=p[key];
    p[key]=list.includes(id)?list.filter(x=>x!==id):[id,...list];
    if(key==='watchlist' && p.watchlist.includes(id)) p.rejected=p.rejected.filter(x=>x!==id);
    if(key==='rejected' && p.rejected.includes(id)) p.watchlist=p.watchlist.filter(x=>x!==id);
    return p;
  });

  const ratePerson = (type:'actor'|'director',name:string,n:number) => mutate(p=>{
    if(type==='actor') p.actorRatings[name]=n; else p.directorRatings[name]=n;
    return p;
  });

  const nextRecommendation = () => {
    setRecommendationIndex(x=>x+1);
    mutate(p=>{ p.recommendationHistory=[featured.id,...p.recommendationHistory.filter(x=>x!==featured.id)].slice(0,40); return p; });
  };

  const openMovie=(id:string)=>setDetail({type:'movie',id});
  const openActor=(id:string)=>setDetail({type:'actor',id});
  const openDirector=(id:string)=>setDetail({type:'director',id});

  if(!loaded) return <div className="splash"><Clapperboard size={44}/><b>Butaca Roja</b></div>;

  const evidence=Object.keys(profile.ratings).length+Object.keys(profile.actorRatings).length+Object.keys(profile.directorRatings).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={()=>{setView('home');setDetail(null)}}><span className="brand-mark">BR</span><span>Butaca Roja</span></button>
        <nav className="main-nav">
          <button className={view==='movies'?'active':''} onClick={()=>{setView('movies');setDetail(null)}}>PELIS</button>
          <button className={view==='actors'?'active':''} onClick={()=>{setView('actors');setDetail(null)}}>ACTORES</button>
          <button className={view==='directors'?'active':''} onClick={()=>{setView('directors');setDetail(null)}}>DIRECTORES</button>
        </nav>
        <nav className="minor-nav">
          <button onClick={()=>{setView('for-you');setDetail(null)}}><Sparkles size={16}/> Para ti</button>
          <button onClick={()=>{setView('mine');setDetail(null)}}><Ticket size={16}/> Mi cine</button>
        </nav>
      </header>

      <main>
        {detail ? (
          <DetailView detail={detail} profile={profile} onBack={()=>setDetail(null)} onMovie={openMovie} onActor={openActor} onDirector={openDirector} onRateMovie={rateMovie} onRatePerson={ratePerson} onToggle={toggleList}/>
        ) : view==='home' ? (
          <section className="home">
            <div className="home-intro">
              <p className="eyebrow">TU CINE, CADA VEZ MÁS TUYO</p>
              <h1>Una sala que aprende contigo.</h1>
              <p>{evidence<5?'Estoy empezando a conocerte. Valora unas cuantas películas y el telón empezará a afinar.':'Ya empiezo a reconocer tu gusto cinematográfico.'}</p>
            </div>
            <div className={'stage ' + (curtainOpen?'open':'closed')}>
              <div className="stage-content">
                <Poster movie={featured} onClick={()=>openMovie(featured.id)}/>
                <div className="feature-copy">
                  <p className="eyebrow"><Sparkles size={15}/> ESTA NOCHE</p>
                  <h2>{featured.title}</h2>
                  <p className="meta">{featured.year} · {featured.director} · {featured.genres.join(' / ')}</p>
                  <p className="why">{reasonFor(featured,profile)}</p>
                  <RatingButtons value={profile.ratings[featured.id]} onRate={(n)=>{rateMovie(featured,n);setTimeout(nextRecommendation,220)}}/>
                  <div className="action-row">
                    <button className={profile.watched.includes(featured.id)?'selected':''} onClick={()=>toggleList('watched',featured.id)}>Ya la he visto</button>
                    <button className={profile.watchlist.includes(featured.id)?'selected':''} onClick={()=>toggleList('watchlist',featured.id)}>Quiero verla</button>
                    <button onClick={()=>openMovie(featured.id)}>Ver ficha</button>
                    <button onClick={nextRecommendation}>Otra película</button>
                  </div>
                </div>
              </div>
              <button className="curtain-hit" onClick={()=>setCurtainOpen(x=>!x)} aria-label={curtainOpen?'Cerrar telón':'Abrir telón'}>
                <span className="curtain left"><i/><i/><i/><i/><i/></span>
                <span className="curtain right"><i/><i/><i/><i/><i/></span>
                {!curtainOpen && <span className="curtain-invite"><Clapperboard size={32}/><b>Pulsa el telón</b><small>Hay una película esperándote</small></span>}
              </button>
            </div>
          </section>
        ) : (
          <LibraryView view={view} query={query} setQuery={setQuery} profile={profile} onMovie={openMovie} onActor={openActor} onDirector={openDirector} onRateMovie={rateMovie}/>
        )}
      </main>
      <footer><span>Butaca Roja</span><span>Tu memoria de cine se guarda en este dispositivo.</span></footer>
    </div>
  );
}

function SearchBox({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder:string}) {
  return <label className="search"><Search size={20}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;
}

function LibraryView({view,query,setQuery,profile,onMovie,onActor,onDirector,onRateMovie}:{view:View;query:string;setQuery:(v:string)=>void;profile:Profile;onMovie:(id:string)=>void;onActor:(id:string)=>void;onDirector:(id:string)=>void;onRateMovie:(m:Movie,n:number)=>void}) {
  if(view==='movies') {
    const list=MOVIES.filter(m=>(m.title+' '+m.director+' '+m.genres.join(' ')).toLowerCase().includes(query.toLowerCase()));
    return <section className="library"><PageTitle icon={<Video/>} title="Pelis" subtitle="Explora, puntúa y ve cómo cambia tu mapa de gustos."/><SearchBox value={query} onChange={setQuery} placeholder="Buscar película, director o género…"/><div className="movie-grid">{list.map(m=><div className="movie-tile" key={m.id}><Poster movie={m} compact onClick={()=>onMovie(m.id)}/><RatingButtons small value={profile.ratings[m.id]} onRate={n=>onRateMovie(m,n)}/></div>)}</div></section>;
  }
  if(view==='actors') {
    const list=ACTORS.filter(a=>a.toLowerCase().includes(query.toLowerCase()));
    return <section className="library"><PageTitle icon={<UserRound/>} title="Actores" subtitle="También aprendo de las personas que hacen que una película te gane."/><SearchBox value={query} onChange={setQuery} placeholder="Buscar actor o actriz…"/><div className="people-grid">{list.map(name=><button className="person-card" onClick={()=>onActor(name)} key={name}><div className="portrait">{initials(name)}</div><b>{name}</b><span>{MOVIES.filter(m=>m.actors.includes(name)).length} películas en la biblioteca</span>{profile.actorRatings[name] && <em>Tu nota: {profile.actorRatings[name]}/5</em>}</button>)}</div></section>;
  }
  if(view==='directors') {
    const list=Object.values(DIRECTORS).filter(d=>d.name.toLowerCase().includes(query.toLowerCase()));
    return <section className="library"><PageTitle icon={<Clapperboard/>} title="Directores" subtitle="El director pesa mucho en tus recomendaciones."/><SearchBox value={query} onChange={setQuery} placeholder="Buscar director…"/><div className="people-grid">{list.map(d=><button className="person-card director-card" onClick={()=>onDirector(d.name)} key={d.name}><div className="portrait">{initials(d.name)}</div><b>{d.name}</b><span>{d.oneLiner}</span>{profile.directorRatings[d.name] && <em>Tu nota: {profile.directorRatings[d.name]}/5</em>}</button>)}</div></section>;
  }
  if(view==='for-you') {
    const recs=recommend(profile,9);
    return <section className="library"><PageTitle icon={<Sparkles/>} title="Para ti" subtitle="No es una lista fija: se mueve con tus valoraciones."/><div className="recommend-grid">{recs.map(r=><article className="recommend-card" key={r.movie.id}><Poster movie={r.movie} compact onClick={()=>onMovie(r.movie.id)}/><div><b>{r.movie.title}</b><p>{r.reason}</p><button onClick={()=>onMovie(r.movie.id)}>Ver ficha</button></div></article>)}</div></section>;
  }
  const sets=[
    ['Favoritas',profile.favorites],
    ['Ya vistas',profile.watched],
    ['Pendientes',profile.watchlist],
    ['Quiero volver a verla',profile.rewatch],
    ['Abandonadas',profile.abandoned],
  ] as [string,string[]][];
  return <section className="library"><PageTitle icon={<Heart/>} title="Mi cine" subtitle="Tu pequeña filmoteca personal."/><div className="collection-stack">{sets.map(([label,ids])=><section className="collection" key={label}><h3>{label}<span>{ids.length}</span></h3>{ids.length?<div className="mini-row">{ids.map(id=>MOVIES.find(m=>m.id===id)).filter(Boolean).map(m=><Poster key={m!.id} movie={m!} compact onClick={()=>onMovie(m!.id)}/>)}</div>:<p className="empty">Todavía no hay ninguna.</p>}</section>)}</div></section>;
}

function PageTitle({icon,title,subtitle}:{icon:React.ReactNode;title:string;subtitle:string}) {
  return <div className="page-title"><div>{icon}</div><div><h1>{title}</h1><p>{subtitle}</p></div></div>;
}

function DetailView({detail,profile,onBack,onMovie,onActor,onDirector,onRateMovie,onRatePerson,onToggle}:{detail:NonNullable<Detail>;profile:Profile;onBack:()=>void;onMovie:(id:string)=>void;onActor:(id:string)=>void;onDirector:(id:string)=>void;onRateMovie:(m:Movie,n:number)=>void;onRatePerson:(t:'actor'|'director',name:string,n:number)=>void;onToggle:(key:'watched'|'watchlist'|'favorites'|'rewatch'|'abandoned'|'rejected',id:string)=>void}) {
  if(detail.type==='movie') {
    const m=MOVIES.find(x=>x.id===detail.id)!;
    return <section className="detail"><button className="back" onClick={onBack}>← Volver</button><div className="movie-detail"><Poster movie={m}/><div className="detail-copy"><p className="eyebrow">{m.country} · {m.year} · {m.runtime} min</p><h1>{m.title}</h1>{m.originalTitle&&m.originalTitle!==m.title&&<p className="original">{m.originalTitle}</p>}<button className="linkish" onClick={()=>onDirector(m.director)}>{m.director}</button><p className="synopsis">{m.synopsis}</p><div className="chips">{m.genres.concat(m.tags).map(x=><span key={x}>{x}</span>)}</div><p className="why"><Sparkles size={16}/>{reasonFor(m,profile)}</p><RatingButtons value={profile.ratings[m.id]} onRate={n=>onRateMovie(m,n)}/><div className="action-row detail-actions"><button className={profile.favorites.includes(m.id)?'selected':''} onClick={()=>onToggle('favorites',m.id)}>♥ Favorita</button><button className={profile.watchlist.includes(m.id)?'selected':''} onClick={()=>onToggle('watchlist',m.id)}>Quiero verla</button><button className={profile.rewatch.includes(m.id)?'selected':''} onClick={()=>onToggle('rewatch',m.id)}>Volver a verla</button><button className={profile.abandoned.includes(m.id)?'selected':''} onClick={()=>onToggle('abandoned',m.id)}>Abandonada</button></div><h3>Reparto principal</h3><div className="cast">{m.actors.map(a=><button key={a} onClick={()=>onActor(a)}><span>{initials(a)}</span>{a}</button>)}</div></div></div></section>;
  }
  if(detail.type==='actor') {
    const name=detail.id; const films=MOVIES.filter(m=>m.actors.includes(name));
    return <section className="detail"><button className="back" onClick={onBack}>← Volver</button><div className="person-detail"><div className="big-portrait">{initials(name)}</div><div><p className="eyebrow">ACTOR / ACTRIZ</p><h1>{name}</h1><p>En tu biblioteca aparece en {films.length} {films.length===1?'película':'películas'}.</p><h3>¿Cuánto te gusta?</h3><RatingButtons value={profile.actorRatings[name]} onRate={n=>onRatePerson('actor',name,n)}/></div></div><div className="movie-grid detail-grid">{films.map(m=><Poster key={m.id} movie={m} compact onClick={()=>onMovie(m.id)}/>)}</div></section>;
  }
  const d=DIRECTORS[detail.id]; const films=MOVIES.filter(m=>m.director===detail.id);
  return <section className="detail"><button className="back" onClick={onBack}>← Volver</button><div className="person-detail"><div className="big-portrait">{initials(d.name)}</div><div><p className="eyebrow">DIRECTOR · {d.country}</p><h1>{d.name}</h1><blockquote>“{d.oneLiner}”</blockquote><p><b>Estilo:</b> {d.style}</p><p><b>Temas:</b> {d.themes}</p><h3>¿Cuánto te gusta su cine?</h3><RatingButtons value={profile.directorRatings[d.name]} onRate={n=>onRatePerson('director',d.name,n)}/></div></div><div className="movie-grid detail-grid">{films.map(m=><Poster key={m.id} movie={m} compact onClick={()=>onMovie(m.id)}/>)}</div></section>;
}

function initials(name:string) {
  return name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
}