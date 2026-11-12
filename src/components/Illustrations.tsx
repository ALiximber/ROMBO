export function StreetScene({ step = 0 }: { step?: number }) {
  return <svg viewBox="0 0 800 520" className="street-art" role="img" aria-label="Ilustración sintética: calle arbolada junto a un parque, con edificios y un cruce">
    <defs><linearGradient id="sky" x2="0" y2="1"><stop stopColor="#c6e1ea"/><stop offset="1" stopColor="#eff0de"/></linearGradient><linearGradient id="road" x2="0" y2="1"><stop stopColor="#a6a79b"/><stop offset="1" stopColor="#777e77"/></linearGradient></defs>
    <rect width="800" height="520" fill="url(#sky)"/><circle cx="610" cy="86" r="41" fill="#f7efd0"/>
    <path d="M0 235 100 212 182 225 244 200 352 221 440 208 555 222 694 205 800 221V390H0Z" fill="#c1cdbd"/>
    <g transform={`translate(${step * -12} 0)`}>
      <path d="M0 112 178 175 178 345 0 407Z" fill="#d7b298"/><path d="m0 100 183 69-5 14L0 122" fill="#b98872"/>
      <path d="m178 175 103 35v107l-103 28" fill="#ead5bb"/><path d="m281 210 78 24v62l-78 21" fill="#c3b199"/>
      {[0,1,2].map(i => <g key={i}><path d={`m${18+i*52} ${148+i*18} 30 10v44l-30-5z`} fill="#677c78"/><path d={`m${18+i*52} ${238+i*8} 30 1v44l-30 5z`} fill="#7c8b80"/></g>)}
      <path d="m204 235 38 8v71l-38 12" fill="#6c8979"/><path d="m196 234 59 15 7-17-66-20" fill="#f4eee0"/><path d="m208 217 10 3v22l-10-3m22-15 10 3v22l-10-3" fill="#c97862"/>
      <path d="M800 168 668 205 668 326 800 354Z" fill="#e3cca5"/><path d="m668 205-92 27v72l92 22" fill="#f1e4c9"/>
      {[0,1,2].map(i=><path key={i} d={`m${695+i*38} ${228-i*9} 21-5v35l-21 3z`} fill="#789695"/>)}
    </g>
    <path d="M0 520 346 289h106l348 231" fill="url(#road)"/><path d="M0 407 346 289 0 477" fill="#e4dcca"/><path d="m452 289 348 65v166" fill="#ddd5bd"/>
    <path d="M491 302 800 380v-59l-234-39" fill="#9caf83"/>
    {[{x:733,y:196,s:1.25},{x:615,y:236,s:.75},{x:532,y:259,s:.46},{x:109,y:247,s:.85},{x:278,y:265,s:.38}].map((t,i)=><g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}><path d="M-8 0 6 0 11 140H-7Z" fill="#6c7260"/><ellipse cy="-9" rx="54" ry="72" fill="#739777"/><ellipse cx="-19" cy="-25" rx="35" ry="51" fill="#87a785"/><ellipse cx="25" cy="8" rx="32" ry="50" fill="#658c72"/></g>)}
    <path d="m397 312 7 0 0 20-9 0m-6 23 13 0-3 33-17 0m-12 32 25 0-4 66-40 0" fill="#ebe6cb"/>
    <g fill="#eeeada"><path d="m210 411 37-26 40 0-30 26z"/><path d="m281 411 23-26 39 0-14 26z"/><path d="m352 411 7-26 39 0 0 26z"/><path d="m423 411-8-26h39l15 26z"/><path d="m494 411-23-26h39l31 26z"/></g>
    <path d="M510 292v-86h46" fill="none" stroke="#5f716d" strokeWidth="4"/><path d="M543 206h21" stroke="#50685e" strokeWidth="9" strokeLinecap="round"/>
    <g transform={`translate(${step*24} 0)`}><ellipse cx="348" cy="316" rx="14" ry="4" fill="#7d8577"/><circle cx="348" cy="290" r="5" fill="#c09b7c"/><path d="m348 296v12m0-7-5 5m5-5 5 5m-5 2-5 10m5-10 5 10" stroke="#52676d" strokeWidth="4"/></g>
  </svg>;
}
export function MapArt({ decorative = false }: { decorative?: boolean }) {
  return <svg viewBox="0 0 600 400" className="map-art" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : 'Plano ilustrado de un distrito ficticio'}>
    <rect width="600" height="400" fill="#ebeade"/>
    <g fill="#d9d9ce" stroke="#f3f2e8" strokeWidth="4"><path d="M25 20h105v86H25zM157 20h102v86H157zM285 20h117v86H285zM433 20h140v86H433zM25 134h105v82H25zM25 246h105v130H25zM157 246h102v130H157zM285 246h117v130H285zM433 246h140v130H433zM433 134h140v82H433z"/></g>
    <rect x="157" y="134" width="245" height="82" rx="6" fill="#b7c9ac"/>
    <path d="M175 175h207m-100-25v51" stroke="#e3e5cd" strokeWidth="9"/><circle cx="282" cy="175" r="21" fill="#e1e3cb"/><circle cx="282" cy="175" r="11" fill="#acc7c5"/>
    <g fill="#92b08d">{[182,212,348,378].map(x=><g key={x}><circle cx={x} cy="150" r="8"/><circle cx={x} cy="201" r="8"/></g>)}</g>
    <g stroke="#faf9f2" strokeWidth="20" fill="none"><path d="M0 120h600M0 231h600M143 0v400M272 0v120M272 231v169M417 0v400"/></g>
    <g stroke="#d2cebd" strokeWidth="1" fill="none"><path d="M0 120h600M0 231h600M143 0v400M417 0v400"/></g>
    <g fill="#c5c4b6">{[40,170,303,455].map((x,i)=><g key={x}><rect x={x} y="34" width="60" height="22" rx="2"/><rect x={x} y="66" width={i===3?90:45} height="26" rx="2"/><rect x={x} y="267" width="64" height="45" rx="2"/><rect x={x} y="327" width="54" height="29" rx="2"/></g>)}</g>
    <g fill="#747d6e" fontFamily="sans-serif" fontSize="10" letterSpacing="2"><text x="242" y="244">AVENIDA DEL PARQUE</text><text x="232" y="190" fontSize="8">PARQUE CENTRAL</text><text transform="translate(139 329) rotate(-90)" fontSize="8">CALLE DE LA PLAZA</text></g>
  </svg>;
}
