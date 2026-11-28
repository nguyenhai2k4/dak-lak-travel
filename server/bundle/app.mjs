import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/entities/dist/decode-codepoint.js
function isInvalidCodePoint(codePoint) {
  return codePoint === 0 || codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111;
}
function replaceCodePoint(codePoint) {
  if (isInvalidCodePoint(codePoint)) {
    return 65533;
  }
  if (codePoint >= 128 && codePoint <= 159) {
    return c1[codePoint - 128] || codePoint;
  }
  return codePoint;
}
function replaceCodePointXML(codePoint) {
  return isInvalidCodePoint(codePoint) ? 65533 : codePoint;
}
var c1;
var init_decode_codepoint = __esm({
  "node_modules/entities/dist/decode-codepoint.js"() {
    c1 = [
      8364,
      0,
      8218,
      402,
      8222,
      8230,
      8224,
      8225,
      710,
      8240,
      352,
      8249,
      338,
      0,
      381,
      0,
      0,
      8216,
      8217,
      8220,
      8221,
      8226,
      8211,
      8212,
      732,
      8482,
      353,
      8250,
      339,
      0,
      382,
      376
    ];
  }
});

// node_modules/entities/dist/internal/decode-shared.js
function decodeTrieDict(input, resultLength, atomCount, dict1AtomCount, ngramCount, dictSize) {
  const base = 91;
  const inputLength = input.length;
  const twoCharBias = dictSize * (base - 1);
  let pos = 0;
  const readSlotCode = () => {
    const c12 = BASE91_INVERSE[input.charCodeAt(pos++)];
    return c12 < dictSize ? c12 : c12 * base - twoCharBias + BASE91_INVERSE[input.charCodeAt(pos++)];
  };
  const dict2AtomCount = atomCount - dict1AtomCount;
  const slotCount = atomCount + ngramCount;
  const single = new Int32Array(slotCount);
  single.fill(-1, dict1AtomCount, dictSize);
  single.fill(-1, dictSize + dict2AtomCount, slotCount);
  const start = new Int32Array(slotCount);
  const length = new Int32Array(slotCount);
  function decodeDelta(count, off) {
    let previous = 0;
    let slot = off;
    const end = off + count;
    while (slot < end) {
      const code = BASE91_INVERSE[input.charCodeAt(pos++)];
      if (code < 89) {
        previous += code;
        single[slot++] = previous;
      } else if (code === 89) {
        let runLength = BASE91_INVERSE[input.charCodeAt(pos++)] + 2;
        while (runLength--)
          single[slot++] = ++previous;
      } else {
        const next = BASE91_INVERSE[input.charCodeAt(pos++)];
        previous += 89 + // eslint-disable-next-line unicorn/prefer-minimal-ternary -- branches read a different number of side-effecting input bytes
        (next < 90 ? next * base + BASE91_INVERSE[input.charCodeAt(pos++)] : BASE91_INVERSE[input.charCodeAt(pos++)] * 8281 + BASE91_INVERSE[input.charCodeAt(pos++)] * base + BASE91_INVERSE[input.charCodeAt(pos++)]);
        single[slot++] = previous;
      }
    }
  }
  decodeDelta(dict1AtomCount, 0);
  decodeDelta(dict2AtomCount, dictSize);
  const references = new Int32Array(ngramCount * 2);
  let poolSize = 0;
  let ngramIndex = 0;
  function readNgramReferences(count, startSlot) {
    for (let index = 0; index < count; index++) {
      const slot = startSlot + index;
      const a = readSlotCode();
      const b = readSlotCode();
      references[ngramIndex * 2] = a;
      references[ngramIndex * 2 + 1] = b;
      ngramIndex += 1;
      start[slot] = poolSize;
      const entryLength = (single[a] < 0 ? length[a] : 1) + (single[b] < 0 ? length[b] : 1);
      length[slot] = entryLength;
      poolSize += entryLength;
    }
  }
  readNgramReferences(ngramCount - dictSize + dict1AtomCount, dictSize + dict2AtomCount);
  readNgramReferences(dictSize - dict1AtomCount, dict1AtomCount);
  const pool = new Uint16Array(poolSize);
  let write = 0;
  for (let index = 0; index < ngramIndex; index++) {
    for (let half = 0; half < 2; half++) {
      const source = references[index * 2 + half];
      const value = single[source];
      if (value < 0) {
        let read = start[source];
        const readEnd = read + length[source];
        while (read < readEnd)
          pool[write++] = pool[read++];
      } else {
        pool[write++] = value;
      }
    }
  }
  const out = new Uint16Array(resultLength);
  let outIndex = 0;
  while (pos < inputLength) {
    let slot = BASE91_INVERSE[input.charCodeAt(pos++)];
    if (slot >= dictSize) {
      slot = slot * base - twoCharBias + BASE91_INVERSE[input.charCodeAt(pos++)];
    }
    const value = single[slot];
    if (value < 0) {
      let read = start[slot];
      const readEnd = read + length[slot];
      while (read < readEnd)
        out[outIndex++] = pool[read++];
    } else {
      out[outIndex++] = value;
    }
  }
  return out;
}
var BASE91_INVERSE;
var init_decode_shared = __esm({
  "node_modules/entities/dist/internal/decode-shared.js"() {
    BASE91_INVERSE = /* @__PURE__ */ (() => {
      const table = new Uint8Array(127);
      let code = 0;
      for (let char = 33; char <= 126; char++) {
        if (char !== 34 && char !== 36 && char !== 92) {
          table[char] = code++;
        }
      }
      return table;
    })();
  }
});

// node_modules/entities/dist/generated/decode-data-html.js
var htmlDecodeTree;
var init_decode_data_html = __esm({
  "node_modules/entities/dist/generated/decode-data-html.js"() {
    init_decode_shared();
    htmlDecodeTree = /* @__PURE__ */ decodeTrieDict("!}.&u%}'&}*'~!6*)%&,~!J~!J~%L~y<~!R,~~%Lu~~#GD~~#|)1#%}^%}2%+#.##%##%}&%##%'#%##&%#%#'%#&#%#&#'#%%#&#%##%#)%''%&%#%#'%#%%#%%}%%%#%#&(23#%%#&-%0%('1#(##%#'##+%'*.:1}#%#6-+(%'%%#%%%}#L'2351&('%}&/N'(0(/*-%(%%}#'+&T%7.2}#&%&#%#36/5##%&%%#&#%%#))2%%##%&&'0~!#*+&'%1~!%).'3q?&%'1~!.##%6(~!+%%%(Gw'rT~!E#<nA%#jZ~!H%(~!42##~!*31&~!G%U~#)5~#`3~!J~!Z~%]~%Y~%C~!q~!u~#kz~%#~!6'~!D~!U~!?~#T~!c%~!G#'~%7|~!G~!J~!G&~#pb~(Df}#%}*&}#%##%##%##&#-}&'#'&%#.++}%mI,#,@&(}*%}*'%&##&#%##%}&0}#.},U},%}+%}&%}#%##&}B%(}(%}+%)})%##%#&}&%##%&}<%}>%#%&}*%}(%}9%}/%})%}*%}*%}?&}&%}3%}&*#%})%#%#)}#&#-#+*%E%%'%'#%}#*V##&##I}#&&##%&%#&&Qf%%))w/0+&%#(#.%-''''++++7}>%4'',##1,#%#&%##&#'##&#*#9)%&%}#*}%,#+P(%A&%#'&##wSD',9E00#y#@}(+}&%&>~!#~!X}#*}(&&}(&}(,%}%&#+&}#&}I%#%}%)#(},'%#*}4%%#%}(''}#/##(##),%-##%%)#&}(.}&%#&}%%}*&#%},&&}&%}#%*'#%})%}D&}&%}-&}6&#&}-,%}#%})-(~+`~,=?~I9'9%~!,#%})%})%}@%}?%}(~!?~#<~#pP~#BG~#=1#%K+~#?#~%;)~#A~#mF1~#A'~'X%'~#lR~#N~'N~#r~#m#-~#i'?%#'%~#B%##%,%#~#_%#0%~#]732~,w~2+#:&#%&'0%&>%}#>##F+)#%&&#(+_}4&}-%}(&}@&}O7Fdf0@+/v4}&WU##&/0#&'('B#%}.%}'+#%}#%%&#&%#%##+#&#)#6#'#.},%}c%},%#%##%&#&%#&~#>'*-.%##%##%}#%%}%'~#)D1}#%*&~#_%%'(~#S2%'.}#~#=##*'*-%}&'%'##&&~'E%.#&~#M4}%%##&'%#~#O1##%&#'+~#<B%##%%'%+~#;#@%}#&%#&&%#(~#H1}'%'##&&~#?A}&'~#D#%32}'&&&&~#[}'(#%}'~#;C})&}%%#%~#=&%,3}%'(#%%~#^'#&&)#%'~#Y%-~#d-%'~#^%%&#&&&}#~#b~2t*&'~&(~&@~0%~e~3}%*''0})&}+~!9##-}#%-hD*)1fC#%/&/fB#40~!+#)*4~!+~!K'&:~!/*7~!.#~!H~!L':~%x&~!H#~!*~%1~!I#~!+A~#p'~!F~~#-#~,,(~.Z~!V~%;'B'mq-W~!N~%I%#&&#&}#%},%%}'%}+X#%}#&}(%}'%}<%}#%}%%'}'%}:~![)9@~%>~#UA%-%##&~!C%~!-.9:~!1~!-^2/:a~!y,D*J#-5)/4~%23,~#G~!L1~!0X3`~!2+~!!0-~&E~!W~!o,>Y&]~%cZx_&~#O*9#A#'#+I'%#)~!0B*-5A+-((F&*M#)(-7-5+'-3a5Vi~!Y~!?+[)%3),ERHm~!+:D,VG.+)?fB%%*(%)'(#&80%1'8`K8?`+'Z#&O&'H5#*9)A%%5&3))0%39+.*7#()&&*=4@**L)<'_&*+..;(#*+)./&0#3)%')-8(4ixD(&.}%,('aI:,)%,k2231T)I'#/-W7,/'Q#.'Y24+h')37</31&83##&0#),H(?'&?/1##%#&&#%''-%&&&#(&''&#.-'%#%%(,')*'&#&#'##%(%(#%('#&##%%%%('%#%#%%#%#&%##h>w+v<ayvyvcg.uuhKr}g/v|g>u9i[~>g5uI~=RvdwEg;v/g;uk!!TTSx]@RT!U!#!@VBRUU!'UTe-d0c`e&gSdicedFcrdTaqb.kYcAohdYd@a3e+d}dMdtd.aJ#bqcK`dle/e.e'dwdPdodddjbEb}ogd^ofdpduc6j?l%d{drdqc)d7bacOdQ%T#Y)X.sR[yH>6Vyv3[xwLu>vo'!*.[yBacahoj>6Rew3[xqdZa#!a&#^(X-[yG>6Vyu3[xvg3sEr|g.u/Ri9db0T#^(Xa)!-[y;>6Vylg4wKs{JwNZt3@3r=c4Z([xlg;wKt!cpq's@v7A'*a(a+!-a#[y<3Dt?3Dt'>6Vym3[xmg9rxsNJwLZt4~?r?db1T#`-!(Xa,!0[yS>6Vz%NuQs.g4wKtnJwNZtS@3r>c4Z([y%g;wKtrdga8!a(!#&T*Y-Xa#!a0<or[yc3Dtq>6Vz43[y3JwNZtf@3s!Ju}!%Dti:pm3c_%X#tjB5pkd6q!r]u?voC'*-a.a2!0a&a+[yI3DtI3Ds~3DtH>6Vyw3[xx;:s#~<5pKJwNZtE@3r~d`a)!a2T#a.(!+U.X1[yT3Dt`3Dtv>6Vz&3[y&g9rxwzcxstPu.<rAJwLZtT~?r@dZa%!a.&^*Za(/Reu[ya>6Vz23[y1g3sEr}wkg{NuQRg{ci(U#5@b`~,cg#U(2WnH5wugcRh7dX#T(Y,a'Ta!!a,[yZ<]mj>6Vz,3[y+Pv#5ReZKu+=,%!H}7ABwkaS?Rh:BcW(X#<]mrj:ubv/ARekdg%!(!a.*Ta(Y.X1!#sP>Rl*Dt6[y>>6Vyo3Wf*jOvuumvuRgRJuq*!:9<B@bX~3jVv&v@s@5Re[d/rQt{uAvo&a&a*)a2!,0Wf!3Dt0=Bs'>6Re}3[xy~<5s%JwJZt1~Gs)c;&!#2sJkNuXvzq7rxu,Re8dka4!a8(aEZ+a@Y.X1Xa)[yd=Bs(3DtP>6Vz53[y4cX#X&Re:avRe9~<5s&JwJZtQ~Gs*i^rzvdRg+Jv{%!2sbB@bX}kdga,!Za?&^*T1/!a'Dt+[y6>6Vyf3Wf%g/u;s4hGu6?Rh-JvZ,!c%#&RoX54Rivj7uyvf8RgTKvZB%*!2sGh<vu5Rgq<=C::9bb~#dZ#T&Ta6Y.X*Dt>[y93Wf)coZ(T,6VyifluvRgC@95@B@bX~/hFu34cC#T,k/unq8w8Q5RkUklwQuzunq8w8Q5Rk8d/rJu?v8w9)-&!a0a;a&aIWejg3sEr/h1s<DtDJvyZqY5aws3Jvy!&Wei~Hr1:au5@Bag>23E~5c:Z&bX};kKv?w&unuVu5Rjc;>bs)#~@:Rh.=ay<a]C;b`}Vd6s/t{uAvoaxa()!a,a7%-a#a2Dt,[yF2Wo[>6Vyt3[xuNuPRi&NuPwpi#RoWh?vf8Ri%Jv]!%Ri:KvxD!.'2WeAjZu`q9rxu,Re7woeAg-unLq(qA_/*2Wg_g3u5q^9:4E}/jTrxrzv=Wkkd~0UX#^^Xa-a1a5T&a=U1a'*aEa]!a*aPaA-adok[y54Rn>;:p3~Dp5g9rpsFNvZqjg3uJp4~<5p0Pw;5qlJwNZt*@3p1Pw:5p/Ou!5p2JvG'!6Vye=<qnJvh_[xhg3v,Rh3kOwOw-sDuev/Re^dha[a%!%!a+#Ta7)-5TaCaO!aka!a)sf[yb2>Rl!9ARiq5E}Qg=ucRkBE|oJrJ_@Wk~@Wk{JrJ_@Wk|@WkyJrJ_@Wk}@WkzJvO_[y2g-vMRmiKuYC!)&>Ri;>Ri<@3RkNc](X#@9Rk=g5vuRmhKvDB!+'=]meg3u4Rmgd)#Y'Vz3CARmfd`a+!%T'!+#Ta1Ta6TaM-sTDt9[yA9sYd'%Y#s[[xpj:ueunaXRgEjRq,v-vuqdd2'`#6Rev<32@5>:2<E}5xIo9a*X#Y(;5RePJvD_g>vyRgNj8w)v8<wggs:RgXiZt|vjx,hSq3ah!-(~@:Ro/Ou!5RhWj^v(pyw8unRhUdx-UY#^Ua.a3a70!)%UX1TaDa)'omRiRRhE[y:3Dsz=Br,>6Vyj3[xkg6ruwjcqsrPw;5r*Ku]D'Zt-@3r(~?r.i[vwv]dU1a--U#`a4(g/vsRhPOu!5RhLj:rmu9Wo!~@:wdh@g/vsRiTjXuvvNr}:RhBj^v(pyw8unRn]dz1UYa'a+^Y(!aETZalaRY.Ta?a4[yDJw1!#qLsW>6Vyrfzq-pLflpwRe|Js>%!Dt@3Dt&Jvy_[xs~HrnjMuwpsw'RecKu+D#'!t<~Grl~?rjg5u-x,gwp{ah!-(~@:Rg~Ou!5Rh'jXuvvNr}:Rh#cW#X/c;&!#2sLi[v7u7RgpJv)(!iLrxu,Re6j7v@s@5Se[e7d`aW!Za(a`T.a#!a3!&aDa-!9)Dt_=6s+3[x~~DR|h~DS6avhGun5RkZj3w)v-]mkKunB!&*]kb97R|i<ARk<c:Z(6Vy}Juh'!wziMRoS:F|vkLuauJv5vtvQRh1d='T+Y#VyO~DR|jcF#T'7R|g97R|kJv3'!ay<Rj,Jvh&!:ReXcsa6*a+#a#_aIRf9aLRf?c,Z&Rf5Rf7c.Z&Rf;Rf>cQ#%T'p-Rf8Rf=ct#%'(*!,p,Rf4p+Rf6Rf:Rf<d~'Ua%U*^UYa(!a,-!#a4YaTalaEX0a8a<Weo3Dt/3Dsx=Br93Wen~Dr;~<5p<JwNZt2@3p=Pw:5p;Ou!5r3c7&!#:p>3Ds}KvGB)_6Vyk2sM=<r7x'eovA(!hFu1ARf}cV#X&@r5j6rvwQa^Rf3c=Za'wkghJv__g;unRggA53B9=b^}%j6uduo5Jq;!(hIv%2Re`Ou4ARe_e%a#^^^Xa&!a*a2!&a6YaP!*ad!#a:aE/5Rn?[y@>6Vyp;:pE~DrY~<5pBJwNZt8@3pCh=rt3rWPw:5pAJup_[xoNuPpF9c!#'45pD5ARn)d8#X'X*3@rU72s]h>v<<sSjJpqvewOJq/(!hNw'5ReBk0s2u3w/w'5ReE5@Jq.!a+JQ!&WeU23d(#Y&RjG5]jBk!u7w&u0udARjEe#+^^^Ub#!a2/a`Z(agT1!a-a;|@TaG!aS[yV=Re~fow'RguNuPRe?bz#'>RoUWeL>:Cbb|?JwPZtVg6ruRmzJvD'!6Vz(g/vmRh~Jvy_[y(g9voRgyx*cy(#2>Ri2B9b]~9kIw9u7rluJu3Rg]dI#a%UY'@=p%CAx.gQZ&RhwwygtRm{x5g_Z'+ABqR9Woa=Bp&dV#^*Xa'!&@o{g4v]Rk;Jv{!%Rk[wkkiA5RkiwwfUB=x,fUuqC&*!>RfTg8v0RfV~ARfSd;rJsAuAv9wR'ae+/aO!a@aza/a#[yQ@Wg!2Wemg3sEr0JvB_g>uvReWg2v+Re=KupB_+[y!2AbY~-~Hr2AJwD!(h<~El>h<~El?Kun@+_:9b`}Kg-v/Ri3g;vtwyk_9]k_d=&T#*U.6qh@Ab`|K9:H|CJv[!&3Dtex'fDwC%!Rf[9WlMd[(^X,!a%Z06Vz!@WgBg=v~Rgvg,QRe@awd,#Y+jTv|Q~EfWj]uNr|~FRfXdy#Y&^Ua%!aO.!(a)Ua;=!a@aKap!a-,a!Ta]a[rSa]p?[y82sK=Bq~;:p:~<5p8Pw:5p7d'#Y'Wf(;RnRi[u4w&RgJJvG'!6Vyh=<r#ijuuv/sIKuYD'ZtG@3p9~Gr&d2#`(g<vtRgFj`u5w&rqpxRf2CJuY!+:wfnTOu!5Rg}jNs1ucv&RfwJvA!&3@q|BDcC#T,k/unq8w8Q5RkTklwQuzunq8w8Q5Rk9dga#!a'!a=#a0!:+Tb*b@aO.a4!aba8aFJv^}?!VyR~Dr<g;u%Rn.~<5p[x'e`wNZtR@3p]Pw:5pZhNvjBp.woe_g5u-r4JwF!%DtO3:ooc7&!#:p^3DtpLuGw(!+%)Dtk6Vz#2sd=<r8d'#Y([y#<x3gJt`w@!)%}MRiowzikRij=]ilxAf3,U(#B2Rf#g0v-Rm[ck{`U#]giKv3>)!&6Ri154s,KuGB_%@r68r:dJ|t`#X(9<E|u2@H|rx3gJu?w'!+'1Nu7Reg4=H~+9<wxgY95Rm]xLggZ-`(X}U2:Ri4h<uOawRmsJv__5@bb{jbV~3dka#a'a]!,#a+U=a>b6a3b%!/aKa/)!arwve^VyJ;:pR~DpTg3uJpS~<5pOPw;5qmPw:5pNOu!5pQJvG'!6Vyx=<qoJvA!{~Jup!%@qk7Rn/KvyD!}''[xz;>wkh'?Rh,x8gyt`w5D!&),(SgyccRgztJ@3pPB5p#d'(Y#<]mmifubw&RgoJvE&!82s^JvF&!8Rf,ADb]~;x=h'rNu]vK!,%'*0RnORh)4Rh*AqQg-vaRnNg;wHwkh'ba~4cE#Ta*x3gctyw@'!+%RnFRnD<4Rn@hFvK5RnCxWg[#`&a0Ua()`1Rm75Rg[c]%X#qi8Rg^NvdRj>BwzgZauwji7Rm6A4wgg]d1#&(*,.0a#Rm;Rm<Rm=Rm>Rm?Rm@RmARmBe%#^^^Xaea?aC/b+(,!a+a#!a/!>a&Ta<aKbD!2wphBRnk[yPw}hE|.=Br-3Dtm>6Vy~g6urRf.x,hPrNav!%'RnqRo%Ro#Nu;q[Pw;5r+JwNZtM@3r)d'#Y'Weh;xChL#`&RnmRnoKu}>%(!Rne~Bs-;2wjcussJv+'!aYSO}6@B<5?ba~8LrNvj!.%*ROwungw~ng~:9;Ri^>wtnig;wHRnixDh@|(UZ.x1h@|)!#:2<H|*xHn]#-UX'3Ro)z=iT}6ARns=Bwsn_wpnaRncw]aR(#UXa&Ua*a/=]iPd'#Y&Ro'WnXf{QRm2hNvj]nZd`'T~&1`{|`#9b]{}c:'!#Wl{>@=be}]?cl{{U#:5Abb}Jds#^YaF!a*b4a#a3aPa>&Tb!bH!*a_!Eau?/a&RjY<]gj>6Vz*;:pe~DrZg,QRj1JwNZtX@wihspcJvZ&!VyX9WmOJu|!|N2WmHJvh&!]ht~Bpbcn&T(!#RmQ<s7Nu;padH#X'`+WmJ@>RmKCARhnKup=!)&Wf+:RhqNuPpf9c!#'45pd5AwghpARn(Ls@w!%,)!RmP@Wfe<E|IJva!&WmNg8vsRmLd`*.`#Y'Xa!axRn*]hrA8Rhug5s@rXg8u!RmMd8#X'X*3@rV72smdI*#UY&RmICARho~GsgxVgd)Ta'U-Y&Xa!T#RnEWnA@Wffg1uDRi0hFvK5RnBxGnG&#`%owp)@wsf+bX}Ze-*1!a*^^^Ua|!#a.aq&Ya2!a>.a6!a:aO`aJDtL[y`@Wg#>6Vz12@wzoYRoZNuPRi!NuPRhzg=ucRi,@=b`{Yg=ucRi-ACJvB!&Sh[ebSh]ebi`wUuFRm4Jw2_[y0JvB!.<Ju(!&SoG}6Shd}6<Ju(!&SoH}6She}6Kur@._g5vHRieJvx!{L2G{Kx6gd'T#?Rh82Wi5cZ#X(g1w)Rm5dW-Y(Ta#!a)!#aYa=wnfE=su2>>bU{0j9udv:<svj8uQv-7RgHdE%#^'sq9sp=>Bb_{TJv`!&g/r|snj6v(us5d,#Y(56H}[978H}]Jw5!&g1rushJvB!+j;v{u5?zDhd}6}bj;v{u5?zDhe}6}ce*#`(^^^a[aea!=!a6a*aoXb1a.!aAbL!b>,b'aL!aV@Wf|2Wlg3[y/JwNZt^@3piPw:5pgJunZou3@rsJva&!Vy_g<v~Rm#JvG'!6Vz0=<r{Ju{%!:pj@WfsiXuJu3Rm:JvZ&!WfA~Bph@c4Z&Dtwax5rubx(#:awRk1@d,#Y&RfjRfid1#,Y(@Wfp2Wlrg5s@ryKu[@!,'=]ig9wlk?Rk>g5u-rqJvy'!@9RkQcH(T#=>Ri~@<wkj(Wj(KuZB*!&<7rw@9RkRcH(T#=>Ri}@<wkj)Wj)dg(Ta2Xa9X#`-!a*CARhg@@=I}d9x;c~#X%so=<sj>2@@=aybb}XjWv0Q~EfEj3vLv;<d,#Y(56H}`978H}_dgaPaFa'a/!#a3Y0a_a;a|!1(a7-[yE3[xt;:pJNvZrrg3uJrvJwNZt=@3pIh=rt3rxPw:5pGOu!5rpJvG'!6Vys=<rz@c4Z&Dt(ax5rtJvZ!&~BpH@wsfNg-vaRlNci*U#=<wei<F}a5@Jq.!a*JQ!%@qZ23d(#Y&RjH5]jCk!u7w&u0udARjFd/prq=tyvpaEa(a:.!a1aZ(@@=I}:9wpd%=<sX55w_h}@@=I{t=ay<aU@@=I}T=ay<2@@=I})?C9:9au@9Cb]}DP~=x-fAZ(2Wl1=ay<aU@@=I}>5@d##Y+jTv|vV~EfFj]uNpn~FRfGdgaK!Z2&!a8a-Tb({E!acTbM*!a(DtY[yYd'%Y#sl[y*hHvh>Re5x2c{Z}.j4uCvcawRiMd+#X+_x&d!},<5RkX;2Hzw@x,gavfB-!{CcF&T#Roe;RodwWbBg5urRgaKvHC*_6Vz+<4opieuew&Rmq@d]&Y)X,T#X0Rh}<BqP=4qS9:ReMg/ujReNJw0!/<Jui%!bd{kawwnemRelAxUa?a3#*.&UX(Ya+a/RhvRnQ<o}9Wmtd-#Y&RgSRmw9;Rmxay=Rmyg-vaRmuxEhSrNu,v-voC!%(aR.a(a7+1Ro1>Ro5CE{A9b]{@;5x#eO{:g;urRi+KrNA!%(Ro3>Ro79;Ri_Ku@>{;&!x%gX|{KunA_+g5QRj/g3u5Rj#g>uERj%wio/xRhS&!,!#^1U}wba{8>>@=be}qC@:D5ba{7Ku+A&!}x?ba}t>>@=be}se(aA^^^Uat!b0#{pa+awUazbGa#aLb9bgaWac'a5TbS=Br!d1#`%scp_Jvl!#rT>Re0JvX&!VyN=H{Fcm#U&:pY=ReaJv2&!]h0=]nUJvG'!6Vy|=<r%JrM_=]h2@Wlud'#)U'Wf'b]{i=]h/Jvh!&~BpWg=v]RnMx+ny#'Nu;pVwjnu=]nwxJnx,T#`&Reqwjnt=]nvieu9vrRjLLuYwP(#+!th@wih5pX~Gr'g5v/Rh4KunA'!-CARnP@wwiN:Rm_9x'cvw>!|l=<saKvAA!0&3@q}>w^e1bp#&Re2Re3BDx7gH#T|f5H|eKuZ>!%(:qNAH{]Jv6!+3B2B9=b^{X<5<B92:E{ZLvhwA(a;a%!igQuyRmad+#Y}m@3Rh5d8#X'X*:AqUAHzmaxwbh<aXRnVcF}RT#Nw&cj#U(BWnug/vsRntdka)(a3+.Zb7aYYan1!bVa@Xa}[y^@b[{G=H{+hFu73Rj&Pv#5ReQcK%T#sig1v{Rj'Ku+D#'!t]~Grm~?rkKuMB!01d5#`'Vy.ta3Dtu~Hroc8#'{^45s85AwZbP&!#Rn!wghxWn#KvEA!)&2RlA2RlBx:h|#(T,=]j09Wobz>x]z/@awRoTd+#Y(az]hFhCrm4d,#Y+jTv|Q~EfMj]uNr|~FRfOdCa!Xa9_X#@<plJvf!%b`{(9;Rgwc;.!#2x7cw#T|UDb]|T5Ju={(!=@E{&Jv)&!Ab`{'awJvf!~*>>@=be{#KuY>!+&4Ezyi[ugv&RjIdea+T)#UXa&T-T&a!Rh9auRmW=]kLg5vuRn+g3u4Rn-Ow6ARn,hHus5xNk?#UX(U~)/g8v0RkD~AwkkF?Ri.OuNBwkkA?Ri/d|a2`a*^UYa.!aBTZaTa'Xa;!(!2!-a#b2[yC>6Vyq3[xr2Wi?g1rusVh%s?DtF~<5rbJs;%!DtBfswKtCj[uvuSsEu3RgVx3o:u+wN'*Zt;@3rd~Grh~?rfg8w)Lq)qE&-a%!>bI|`jWv0vV~EfCjTv|vV~Ef@j]uNpn~FRfBcK#T']gWNu7x,k7q4ai(0!hHv8<RhmkMu9vrsBuev/RhlCJvB!,g<v{wchh~@:Rhji[vrv{wchi~@:RhkdS&a5UY#Ta!RgPwwiI5BwciI~@:Rh`x'iJvj'!5]iJPu8Bwch]~@:Rhach)U#h3rp]gLh@t|Ax,hTq3ah!-(~@:Ro0Ou!5RhXj^v(pyw8unRhVd|)`,^UYas!a?/a2Z'a^Ta{Tb7Ta(a#!a,Wf&9sZ3DtAadamov=Bqt3[xig8vsRm~>waiL2b`{QJv*_Ouv2qgj<v]v2BqfdR'X*X#Y-@3qr~Gqv~?p6hHv-]glPup5Lq+q?_%*b_{qF{n9b^{rOu4ARhpKvCD!+&~Bqp:5Dbb}nwoiKl&unuTuBv]v+ueunaXRf0=Jvh!0nKufu8v1w&w7q%w&uHrz:Rgnj5w,uxDJq/(!hNw'5ReCk0s2u3w/w'5ReFd>Za&!*UaA=<wkgsRnSJv^!%Refifw3vyRgOKu_B'!,<]gkiiu:w&Rh<=C@a^<B57@2F{[<B5@aW:=3away9A5aW=<B=C@a^<B57@2F{Ie-#`(^^^bCara.b8aza6!/bZ,!adTbnTbOb+aFaS!aAT9@Wf~2Wli3Dtl2@d,#Y&RfnRfmJwJZtN~GqyJva&!VyMg<v~Rm%iXuJu3Rm9Jv[_=]ih9wlkDRkCd1#`(@Wg>2Wls3cH#T(@<Rj*=>Ri|b~'#23s9h<~El.d'#Y&Dtxi^rzvdRl#d*#U%(o|B2s`hJwSaxRmDKv4B&!1:Rmdd5#`'Vx}to~Hq{x'f1v3(!BA5ba|bJv_&!Wfug1v]ReIdO+U/Y#&G}-8wze=Rh{g1v]ReHg/uQRf/by#)ibQwERl/cH#T(@<Rj+=>Ri{cNu+vlax-!(#a0qa9<Rii2;;bU{H;x<i=&X#Rk`<4wwi=C9H~8xAI(Y#<azRi@45wXI<B9;5bb~7dL(X#Xa(+!aL6Vy{g5QqOau:5au2@ay547EzbxOcU(UX-T#Ta#:Cbb|A?wjh/b_|SOw6ARgtihr}u7Rhy<d1#T)X1@@=I|~=ay<2@@=aybb}Sj3vLv;<d,#Y(56H}A978H}@dGpvs@uAu`vcw9*!aFa+ai%(b!aXa8.a?a[ozWey=sU2@G}Nch&U#Rf_WexKu+D#'!t:~Gr`~?r^j]uNr|~FRg*j^psurwJt|RmcKv)@&!)7Rkv~Br[@wxfO:Rl3co#U'6Rezj_q#vIuavjRltwzeyh@vr5JqD0!>aY?C9:9au@9Cb]}9cl#U*5;5<H||jbuus1ucv&Rfvg1v~d/pppzqFr^a--a~!aMat1(hFv;Wiz@@=Izoj5uuv-7Rix~Cw`fk2WlVcZ#X,k)u3vWs@u2]ktg;wEx'fBq(_2Wg/jTv|vV~EfoJv]!15x'hzqG!(P~EfU~CRl_j6v(us5x4i-#T(2WmZ?C2F|d>Kq<aj1!*jTqIsBv=Wl`~Cw`fi2WlWj`v0u*~>RlR=c>Z,k#u3vWs@u2]kr<c1Z+jTqIsBv=Wla~Cw`fm2WlXdmb3!a{(arZa`bkTa%TbQTa-a9+c'!aM!/[yL=Bqug.w'RifhFvyDRj.g>vgwyk^9]k^Jv3_@WfbAARkhJw2_[x|JvB_wkoIRoKwkoJRoLd'(Y#<]gm=<9<H|yd'%_X#skDtb3awwqkgNulRkgdB#^',9:p'hJwSaxRmEBwVb8@4=H|qLu+w50&!)@3qs~?pU>Awwn;;Rn=c:Z'ARn<=<qwKvC@!/&~BqqJv6!&]eVb^z^xRge'/a%+^`#Sge}6<4Rn3=]n0Pw2>Rn8Jw0!&>Rn:>Rn6cY#a7+!a&=<wkaNw~h3z_c5Z{=wjh#=]nLKv^D!&)Vyz=bW|swYb<WetcG#T(2wxa@qVx@gD#Y&b^|V5JwG&!5bb|pg/w&RgD@x=kHs=uAvn!a%%/'+RmSRh694Ro`g-vaRmRhHv-]mlxCcS#`&ba~.5cD#Ta)P~=d,#Y(56H{>978H{Dd_#{2^Y%_+qbbb{6g3sERhsbU{?dfa.,`a(Xa<!aiX#(55RiG54RiHcI#T'WiU3RiVNvdwtfcRlKNvdd,#Y&RlHRlExQgf.1*^T'X#Sgf}6Wn4=]hfPrk>Rn7Jw0!&>Rn5>Rn9Lunw?&a2!,5<oq@@wqfdRlJj5Q~=d,#Y(~ARfcOuN]fdDKw;ay(}i!547E}j?cI#T(@5bV}iCbV}hdv(^^Tb?a40,b##Tbo!a*bR!a<b|a/!aKai!aU[yK=]o^g:v>ReGJwPZtK<7Rh+h<~El,Pv#5ReR@awwxjCg,ulRjDJv6&!]j!z?aQeeg>w=Sh<eeJw;!&axEzOg,Qosc!#*:wkeJ]eJ>x'h-u(!%Ro.w~h.zPdNZ(X,Ya![x{;9ReY;wkgxRiF:x?ap#Y&RmUg<s2Rkod]+UY0TZ'!a&A9sw<=bczLNvuw{gqzNhJwSaxRmCKuLay!#&s_Rf-55b^{uJvZa!!c%#(55Ri654wmiu5RiuawLu,vp!+}^%b_}Y9;wkgxba}o>A9:=b^}zKuh=a''!3awRk3c*'!#aHRk6c+Z&Rk5Rk4Jv)&!awRjSawd9*`#0?C2@EzMj8u<uJ5RmbjQrquJu3x,k>uq@_+=ayb^|W~ARkEOuN]k@7dhzV^X/X&a-#zRzSb`zXcJzTT#2WkVKvDBzW!%FzY9;5bbzWjQrquJu3Jw3%!b`zU=ayb^zQd:#X(T-a!6Vyywxh}=b]{Jg=u1RiAdGp~qHtzv!w(wA+a+a;<!aJaYai'anasb(=azRmV:Cbb{MLq2vb!%')RjuRjrRjtRjqx3jnqCw3!%')Rk(Rk+Rk&Rk)Lq2vb!%')Rj{RjxRjzRjwLq2vb!%')RjsRjpRjfRjex3jcqCw3!%')Rk'Rk*RjkRjl9<CbbzfOu4ARhxLq2vb!%')RjyRjvRjhRjgx=joq*uKvb!%')+-Rk.Rk%Rj~Rk-Rk#Rj}x=jdq*uKvb!%')+-Rk,Rk!Rj|RjmRjjRjidAq&qKs@uAv8Aa.'*-a@a&0!aM@a5[y73Dsy3Ds|3Dt):wxgI2sHJwJZt.~Gqxwsf0ikrzt}Rl0Jvy_[xj~HqzKv_A|D!&WfP8axRoVcf,U#k(v]v+ueunaXRf1Ju}'!g8u#Ri=jQw!sCunLprq>!,')~<5qeGzq9F{W=c##%s5au:5aU3CBE|;d4#X(D!a&6Vygx(b;#(=]ed?C2F{N<capoq2r[a&!aPa9,'Pw;5s:@@=I|,55w_h|@@=IzcP~=x'fCqB_2Wl2>aU@@=I|1OuNBc1Z+jTqIsBv=Wlc~Cw`fl2WlZ~AcTa%!Z+jTqIsBv=Wlb~Cw`fh2WlYk+uNqJsBv=WlSg,u3dca3#UXaMYa)TaB-=cM|7T#<bI}l5@B932:aV2G{BOuNBJq:|M!5Ezt=<B=C@a^<B57@2F{v>cB{/T#=ay<bI{3Jv6!a.6BKq0ah&+!5E}HP~Ef{978BaU@@=Iza<7d#.Y#978BaU@@=IzH~AJq0!(@@=IzG978BaU@@=IzFe,aU*Y&^^^bvJb,b:bFad!a,c2Ta>aL.bo6!a#CbTa'T#Re{2Wlh2@G{yg6t~Ro_NvdRfticuRQRllJv3&!x&c|zs@Jw3!%RflwpfkRlpKuL;%(!Re<@G|C2GzdhIvuBwgjAg-u0RjAKQB%!(GzZ@G|5NuuRl7d='T+Y#Vy[g<v~Rm!==G|>JvA!)@wma=]m1ifuaw&RmnLs@vT'!|/+[y,g:v>ReTJw1!#qX=x!eC{bLu+wT&)ZtZauq_~Graci&U#F|89:r_Lupvq!.)&2RlG8RfaC=x!eF{_h?rpWlmd&'!#X|&]k::xJey#`'T|+<E|&2@H|%dE#(^,g;u.RiEg6vjRiC9xCkA{O|zY#g=ucRmXKs0@!&*@G|m@awRknJuh!,3d(}gY}eJvj!%Rm):Jw3!%Rm+Rm-Ls0w(&!a(a#@b[|6cZ#X'7RkxWgAOu4ARn'dH'U#Y*Vz-Wm'CARm}d]*#a%^a*T'aK!a<9bV{PC=p*Jw4!&SgxcbB5r]idw(wBRmF7xFkt#&`(Rm/Rm8E|!JuY_9:Rl5=wrgr2:bbxd@xXfB(a*#T+!.X0X1Ta/a'T&RlDRfL>RlyARl9b[z[>RfZ:RlL:RfRwlg/ARl;9;RlxKv,A/!%7s69<74=BA5ba{-8Bde#`a<XaKYa1,a'P~=wxfB2bZ}}?C972@@=I}r8@55B9;5bb}G978B2@@=aybb}3j3vLv;<Jw3&!>Rfk=ayb^}4~Ad1#`*@@=aybb{w2@>==<bbz]dx+UY#^UaF!a9!bB'Ya1.!ajXa#%olRhD[y=3Dt#Ov5BrHKuMB%!(Rf^Wep~HrJwkiQjKr|~FRg)Ku+D#'!t5~GrF~?rDdV)UY,Z/_7RkuG{<~BrBg,rlsO:235B@bX}|d?a1!#`(6Vyn5@d##Y+jTv|vV~EfIj]uNpn~FRfH7Lq2vb1!a9-978BaU@@=Iz9978BbU}#~AJq0!(@@=Iz8978BaU@@=Iz7~AJQ|}!978BbU}!JvkaK!AdUa21-U#`a+(g/vsRn~Ou!5RPj:rmu9WhOjXuvvNr}:RhAj^v(pyw8unRn[kPr}p|u7vwv]RiSBd;pppzq@qHQa?(b.!a.a`@.|xa(hFv;Wiyj5uuv-7Riw~Cw`fg2WlU978BbU|wOuNBJqG!(P~EfD~CRlQcZ#X,k)u3vWs@u2]ksg;wEx'f@q1_2Wg.j]uNpn~FRfqJv]!15x'h{qG!(@@=IzK~CRl^j6v(us5x4i,#T(2WmY?C2F{1>Kq<aj1!*jTqIsBv=Wld~Cw`fj2Wl[j`v0u*~>RlT=c>Z,k#u3vWs@u2]kq<c1Z+jTqIsBv=Wle~Cw`fn2Wl]dn1#c(a(b^a2!b/bAT(bj!aDa7bu,a_a{c0!2T0g:v>ReD2@G{42@G{5~DpM~<5rc=Bx6i>{RT#RnI@zCx]y]z:2Jv[!zr5Awyk]9]k]dD(Y+X#6Vz.g=wKtgwhaCwgmTWj2Lu,w%_+/[y-B;b^xeg3u3Rj-2@bX{*KrJ<!+'@Wg(g?QRlC@Jv`!%b[zIwsfII}8JQ_@w|kW|=Jv(%!AqcOuNBJvEzh!bYzjLs@wP#(0!oy@>RkdJwMZtc3Dtd@BcG#T'9bWxg2@2Fznd*#Y+;2x'c}w<zizixNgwa#Z'U+!/!a'!a+w~g~z6wcn{Rn}wcnzRn|5Rh%=]nJg5vuRmvNvdRlvcprJu}w*az*a#!%.a.'Bot9qT]kj@Wg'ay2Gzv@Jv`!%b[zEwsfHI}1;ck#Ux`<Cbbx_Lu+w!a&0*!wko*wwo,So,}6Juqxf!E}PigQuyRm`d3(`#8>Rn%:A5B;bZ~%KvhCa!a2!x>k7#Uxb@b{#xaRk7Jw0!)>wwhlShl}6>wwhmShm}6CJvB!.x'hhvj{!!5Bwkhhbaz}x'hivjz~!5Bwkhibaz|xEhTrNu,v-vpD!a%&/)a3a.,%Ro2t[CE{)@3re9b]{%wjo09:rgc:Z&Ro6=<riifuaw&RmoKrNA!%(Ro4>Ro89;Ri`dSaL'UYzxZb)7Rka3xRhT&!,!#^1U}vbaz{>>@=be}yC@:D5bazzKu+A&!}{?ba}y>>@=be}wxBh[t`u~vJvr!%a!a()a,a0a4RoC=]o;Ju(!%RoGRhdwjh`=]oAg>w#Ro?g5vuRo=NvdRl|Ku]C.!&;RoEJvB!%RoORoMBx'h[v+_?w~h`}~5?w~hd~!xKh]oiptu-utv.vp!#%&a30a@a'a+(a/aOp(o~p!RoDJu(!%RoHRhewjha=]oBNvdRl}g>w#Ro@g5vuRo>c[#X']o<CauRoRAd-#Y':RkpauRoQKu]C.!&;RoFJvB!%RoNRoPBx'h]v+_?w~ha}t5?w~he}ue!/UbhYacXaW^Tc&a;b:a-c/#b&aja1(!cL+!bKbt!bmcRc9aIc?8[yW3Dtt94Rg`Jv}!&SiRMzBhEebShEMNuPRe>x7gL#TzuwjirRipc<Z&>on;>z=h-MSh.Mwqczx'a7vj&!>Re4@=ResJt__NuPRi*NuPRi)j]uNr|~FRfzKrJ>_+@Wfy@Wf]2WocKrJ<!+'@Wg%g/QRl@@Jv`!&awRl<wsfFIzgLu(w*!.*&ShBMwvhIRhI9;RhNx1hK'!#Sn]Mx1hK~0!#:2<H~7cNu+w7D*'1ZtW>Rn1~?rOc:Z&Rn2=<rQ<7wjh&=BSnLMc]#X(6Vz)w[b=a!U#9wzgMc3#&(RgMRitRis<x,gKt`ax!&+SioM=BSilMc3#&(RgKRinRimKurB,!&SiQMzBhDebShDM6BJQ!(P~Efx978B2@@=I}WLrJw!!,a*&@G}O@9wkibRid@@x'fKwC!&SlDMSfLMjUv~Q~EfKKv3@a+!(hFv-]mpx/hYZ(C5RiWz<o/MwkhY?So/M@x,gbvfB*&!SgEM:SoeeehFu3:Rgbda(,^TZa)X/7Sg[eb:2RgI~BrMC@wgkc:wwkcRerx3h(uUvK!&*,SnOM4Sh*MArRg;wHRh(x=h;rJvPwI!a4',a'0@Wg&=BSh/Mg>w=Rh=g3w*wwgGRgGcW(X#;Sg}M2Gzk@Jv`!&awRl=wsfGIz`dKZ*T'Y-:RhR7RhQg5u-p`j6v(us5d,#Y+~Awkia?RicOuNBwkibba}Ld6p~tyu_vbAa'a+!a/'a3aEa8a!>Sh,ebJv{!&Sh@ebSaReb9;SgwebNuPRi(NvdRl)NuPRi'hHu^<Rm^Jvv_@Wl(g;u1Si/ebKu'B&!*Sh?eb@Wl'z@aPeb95Si.ebcpputyvjB)!,&a+0a%ShAMWeK@G}C@WfJ9;RhMwvhH9w{ia}ix,hJvRA1(!zAn[MRhHx1hJ~*!#hFv(BSn[MBJQ!(@@=I~'978B2@@=I}2db.Ua<'X}+T#a0XaG2G}E;wkg|wuh!Rh!x,hZu,@)!&So0MVy)C5RiXACJvB!&5RiY5RiZg8w)cG}*T#2@bU}=KsA>(!a.3wkhZba~(x,h^u(A!&(SoCMRhb5Bz=h[eb?w~hb~6x,h_u(A!&(SoDMRhc5Bz=h]eb?w~hc~6e)aA1T#T,^^^c-bMb&blcPaP(a/!0!bA=b5c@a(!bfbrc#2afwmhARnjwchORnp2Wlf3DtsNvdRl-2@wpa<]m0bx(#:awRk2@Jw3!%RfhwpfgRlnKQB%!(G{V@G|'NuuRl6d='T+Y#VyUg<v~Rl~==G|<Jv+'!aYShC}6@B<5?ba~8@Jw3'!g2QRljhLrpWlOd+#Y'g.w'rIg>w*wgj@g-u0Rj@Lu+wT&)ZtUauq]~GrGci&U#F|39:rELrNvj!.%*RhCwunfw~nf~:9;Ri]>wtnhg;wHRnhx3hDs@v~!/+'@Wfr@9RkSNu&Rlo=@<5GzoKs0@_+@Wl+@awRkmJuh!-3d(}pY#qWJvj!%Rm(:Jw3!%Rm,Rm*de&!1U-U#`)Re;@G|.@9Ri82@wjfvRlq=@<5GzpLvOvr!).&2RlF8Rf`C=x!eE{.Jw3_g2QRlkhLrpWlPde(!#U{s,UXa*Ta'[y'g:v>ReS;x0PZ&RnlRnn~HrKJw1}f!=x!eB|2w]aP(#Xa&a*Ta.Ua2a7=]iOd'#Y&Ro&WnWg;u.RiDg6vjRiBNvdRlzhNvj]nYJuW_2Wm3x)kFze{9d])!a.!,Y01!#&aC!a3RndC=ox~BrC@2b^{pg,rlse7x'ksuq!%Rm.E{xidw(wBRmGx9o+)X#wwo-So-}69:Rl4@xSf@a#XZ'X)X,Ta(/ARl8b[xc>RfY:RlI:RfQwlg.ARl:9;Rlwdn'#^XafaQa1X1TaHTa)@b[{zcZ#X'7RkwWg@Ou4ARn&x)kG#{,g7u/RkGdH'U#Y*Vz'Wm&CARm|bx#(A]gUbUzJj9Q~=d,#Y(56H}l978H{U7d,0#U*2>ABb_xZ978BbU{e~AJQ{g!978BbU{hxMh?ad{oUYZ.x1h?{l!#:2<H{mx3n[t{vl!,&a%3Ro(z=iS}6ARnr=Bwsn^wvn`Rnbd`*T}B0!#^X'BG{c9b]{a>>@=be}F?JvS!&BG{d7BG}(Bde#`a1X,Ya@!a'P~=wxf@2bZ}I56B2@@=aybb}08@55B9;5bb}<j3vLv;<Jw3&!>Rfg=ayb^}&OuNBKuLA!)a!P~=x#fD{f2@>==<bbzl?C972@@=Ix^d6rSu,v7w*C(0a)a6#B+a%!sQ[y?3Dt%3[xn~<5rLOu!5p@Ku+D#'!t7~GrP~?rNKvlaya7'!h+v-5qMg=t|cd,U#5AAaa5Abb{S@52B5@a[@52B5Gx[iXueu;d<#`a(!/549C;ag>23ExY5@Dah89b^~689Jv)!~2b[~1Lv'w(%*!a#bX|aPrmawRe]keu7uhv-q6rxu,q`xTo]/a5aU!bNaDXbi!b-!ao!b<bwA!#5@B932:aV2G|:d-)Y#hJrL>RhG<7@C5<H|_=Cau:5aj5@B932:bJ|ng>vIbs)#?C2F|9jPv0w.vISh-MKvUaz(.!9ABbb|[5;5<H|Eg>unwfh;9:4E|YjQsBt|vjx'hYq3!(?C2F|J:2<BaY?C2F|GOu!5x,g|p{ah!-(?C2F|c9:4E|OjXuvvNr}:Rh&i[w*t|cd+U#jJvsu)vsSn~Mkfrmu9p}u7vwv]So!McW#Xa!ax5@A5aY:5;5<H|>kJv~vYrquJu3x4ib#T)2@SmZM?C2F|Bj:rmu9@xPhI(a*a#U#`a3-5Abb|L~@:RhK9:4E|0@52B5G|#C::aY?C2F|-:2<BaY?C2F|.5Jvk!a)javYrquJu3x4ia#T)2@SmYM?C2F|HAxPhH(!a#U#`a*-5Abb|4~@:RhJ9:4E|R@52B5G|F:2<BaY?C2F|Sc^#Xa2j=Qq5CJvB!-g<v{z;hhM?C2F|Zi[vrv{z;hiM?C2F|XKsA>!a)-g<v{z;h[eb?C2F|]i[vrv{z;h]eb?C2F|^iZu.vix,hZq3ah!.(?C2F|QOu!5ShXM:2<BaY?C2F|P", 13494, 2713, 49, 25, 61);
  }
});

// node_modules/entities/dist/generated/decode-data-xml.js
var xmlDecodeTree;
var init_decode_data_xml = __esm({
  "node_modules/entities/dist/generated/decode-data-xml.js"() {
    xmlDecodeTree = /* @__PURE__ */ new Uint16Array([
      512,
      26465,
      29036,
      7,
      0,
      2,
      4,
      116,
      24638,
      116,
      24636,
      8693,
      29807,
      24610,
      621,
      1,
      0,
      0,
      3,
      112,
      24614,
      111,
      115,
      24615
    ]);
  }
});

// node_modules/entities/dist/internal/bin-trie-flags.js
var BinTrieFlags;
var init_bin_trie_flags = __esm({
  "node_modules/entities/dist/internal/bin-trie-flags.js"() {
    (function(BinTrieFlags2) {
      BinTrieFlags2[BinTrieFlags2["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
      BinTrieFlags2[BinTrieFlags2["FLAG13"] = 8192] = "FLAG13";
      BinTrieFlags2[BinTrieFlags2["BRANCH_LENGTH"] = 8064] = "BRANCH_LENGTH";
      BinTrieFlags2[BinTrieFlags2["JUMP_TABLE"] = 127] = "JUMP_TABLE";
      BinTrieFlags2[BinTrieFlags2["VALUE_MASK"] = 8191] = "VALUE_MASK";
    })(BinTrieFlags || (BinTrieFlags = {}));
  }
});

// node_modules/entities/dist/decode.js
function isNumber(code) {
  return code - CharCodes.ZERO >>> 0 <= 9;
}
function isHexadecimalCharacter(code) {
  return (code | TO_LOWER_BIT) - CharCodes.LOWER_A >>> 0 <= 5;
}
function isAlpha(code) {
  return (code | TO_LOWER_BIT) - CharCodes.LOWER_A >>> 0 <= 25;
}
function isEntityInAttributeInvalidEnd(code) {
  return code === CharCodes.EQUALS || isAlpha(code) || isNumber(code);
}
function determineBranch(decodeTree, current, nodeIndex, char) {
  const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
  const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
  if (jumpOffset) {
    if (branchCount === 0) {
      return char === jumpOffset ? nodeIndex : -1;
    }
    const slot = char - jumpOffset;
    if (slot >>> 0 >= branchCount)
      return -1;
    const stored = decodeTree[nodeIndex + slot];
    return stored === 0 ? -1 : nodeIndex + branchCount + stored - 1 & 65535;
  }
  if (branchCount === 0)
    return -1;
  const packedKeySlots = branchCount + 1 >> 1;
  const branchEnd = nodeIndex + packedKeySlots + branchCount;
  for (let index = 0; index < branchCount; index++) {
    const packed = decodeTree[nodeIndex + (index >> 1)];
    const key = packed >> ((index & 1) << 3) & 255;
    if (key === char) {
      const pointerIndex = nodeIndex + packedKeySlots + index;
      return branchEnd + decodeTree[pointerIndex] & 65535;
    }
    if (key > char)
      return -1;
  }
  return -1;
}
var CharCodes, TO_LOWER_BIT, EntityDecoderState, DecodingMode, EntityDecoder;
var init_decode = __esm({
  "node_modules/entities/dist/decode.js"() {
    init_decode_codepoint();
    init_decode_data_xml();
    init_bin_trie_flags();
    init_decode_data_html();
    init_decode_data_xml();
    (function(CharCodes3) {
      CharCodes3[CharCodes3["AMP"] = 38] = "AMP";
      CharCodes3[CharCodes3["NUM"] = 35] = "NUM";
      CharCodes3[CharCodes3["SEMI"] = 59] = "SEMI";
      CharCodes3[CharCodes3["EQUALS"] = 61] = "EQUALS";
      CharCodes3[CharCodes3["ZERO"] = 48] = "ZERO";
      CharCodes3[CharCodes3["NINE"] = 57] = "NINE";
      CharCodes3[CharCodes3["LOWER_A"] = 97] = "LOWER_A";
      CharCodes3[CharCodes3["LOWER_X"] = 120] = "LOWER_X";
    })(CharCodes || (CharCodes = {}));
    TO_LOWER_BIT = 32;
    (function(EntityDecoderState2) {
      EntityDecoderState2[EntityDecoderState2["EntityStart"] = 0] = "EntityStart";
      EntityDecoderState2[EntityDecoderState2["NumericStart"] = 1] = "NumericStart";
      EntityDecoderState2[EntityDecoderState2["NumericDecimal"] = 2] = "NumericDecimal";
      EntityDecoderState2[EntityDecoderState2["NumericHex"] = 3] = "NumericHex";
      EntityDecoderState2[EntityDecoderState2["NamedEntity"] = 4] = "NamedEntity";
    })(EntityDecoderState || (EntityDecoderState = {}));
    (function(DecodingMode2) {
      DecodingMode2[DecodingMode2["Legacy"] = 0] = "Legacy";
      DecodingMode2[DecodingMode2["Strict"] = 1] = "Strict";
      DecodingMode2[DecodingMode2["Attribute"] = 2] = "Attribute";
    })(DecodingMode || (DecodingMode = {}));
    EntityDecoder = class {
      decodeTree;
      emitCodePoint;
      errors;
      /** The current state of the decoder. */
      state = EntityDecoderState.EntityStart;
      /** Characters that were consumed while parsing an entity. */
      consumed = 1;
      /**
       * The result of the entity.
       *
       * For named entities: the trie index of the best legacy match so far
       * (0 = none). For numeric entities: the accumulated code point.
       */
      result = 0;
      /** The current index in the decode tree. */
      treeIndex = 0;
      /**
       * Characters consumed since the last recorded legacy match, plus one.
       * Invariant at the top of the `stateNamedEntity` loop: `excess` equals
       * the number of unrecorded consumed characters + 1.
       */
      // biome-ignore lint/correctness/noUnusedPrivateClassMembers: False positive (read via destructuring)
      excess = 1;
      /** The mode in which the decoder is operating. */
      decodeMode = DecodingMode.Strict;
      /** The number of characters that have been consumed in the current run. */
      // biome-ignore lint/correctness/noUnusedPrivateClassMembers: False positive
      runConsumed = 0;
      constructor(decodeTree, emitCodePoint, errors) {
        this.decodeTree = decodeTree;
        this.emitCodePoint = emitCodePoint;
        this.errors = errors;
      }
      /**
       * Resets the instance to make it reusable.
       * @param decodeMode Entity decoding mode to use.
       */
      startEntity(decodeMode) {
        this.decodeMode = decodeMode;
        this.state = EntityDecoderState.EntityStart;
        this.result = 0;
        this.treeIndex = 0;
        this.excess = 1;
        this.consumed = 1;
        this.runConsumed = 0;
      }
      /**
       * Write an entity to the decoder. This can be called multiple times with partial entities.
       * If the entity is incomplete, the decoder will return -1.
       *
       * Mirrors the non-streaming `decodeWithTrie`, but with the ability to stop decoding if the
       * entity is incomplete, and resume when the next string is written.
       * @param input The string containing the entity (or a continuation of the entity).
       * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
       * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
       */
      write(input, offset) {
        switch (this.state) {
          case EntityDecoderState.EntityStart: {
            if (input.charCodeAt(offset) === CharCodes.NUM) {
              this.state = EntityDecoderState.NumericStart;
              this.consumed += 1;
              return this.stateNumericStart(input, offset + 1);
            }
            this.state = EntityDecoderState.NamedEntity;
            return this.stateNamedEntity(input, offset);
          }
          case EntityDecoderState.NumericStart: {
            return this.stateNumericStart(input, offset);
          }
          case EntityDecoderState.NumericDecimal: {
            return this.stateNumericDecimal(input, offset);
          }
          case EntityDecoderState.NumericHex: {
            return this.stateNumericHex(input, offset);
          }
          default: {
            return this.stateNamedEntity(input, offset);
          }
        }
      }
      /**
       * Switches between the numeric decimal and hexadecimal states.
       *
       * Equivalent to the `Numeric character reference state` in the HTML spec.
       * @param input The string containing the entity (or a continuation of the entity).
       * @param offset The current offset.
       * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
       */
      // eslint-disable-next-line unicorn/consistent-class-member-order
      stateNumericStart(input, offset) {
        if (offset >= input.length) {
          return -1;
        }
        if ((input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
          this.state = EntityDecoderState.NumericHex;
          this.consumed += 1;
          return this.stateNumericHex(input, offset + 1);
        }
        this.state = EntityDecoderState.NumericDecimal;
        return this.stateNumericDecimal(input, offset);
      }
      /**
       * Parses a hexadecimal numeric entity.
       *
       * Equivalent to the `Hexademical character reference state` in the HTML
       * spec. Digit parsing matches the hex loop in `parseNumericEntity`.
       * The accumulated value is preserved for numeric validation callbacks.
       * @param input The string containing the entity (or a continuation of the entity).
       * @param offset The current offset.
       * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
       */
      stateNumericHex(input, offset) {
        const inputLength = input.length;
        let { result } = this;
        let { consumed } = this;
        while (offset < inputLength) {
          const char = input.charCodeAt(offset);
          if (isNumber(char) || isHexadecimalCharacter(char)) {
            const digit = char <= CharCodes.NINE ? char - CharCodes.ZERO : (char | TO_LOWER_BIT) - CharCodes.LOWER_A + 10;
            result = result * 16 + digit;
            consumed += 1;
            offset += 1;
          } else {
            this.result = result;
            this.consumed = consumed;
            return this.emitNumericEntity(char, 3);
          }
        }
        this.result = result;
        this.consumed = consumed;
        return -1;
      }
      /**
       * Parses a decimal numeric entity.
       *
       * Equivalent to the `Decimal character reference state` in the HTML
       * spec. Digit parsing matches the decimal loop in `parseNumericEntity`.
       * The accumulated value is preserved for numeric validation callbacks.
       * @param input The string containing the entity (or a continuation of the entity).
       * @param offset The current offset.
       * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
       */
      stateNumericDecimal(input, offset) {
        const inputLength = input.length;
        let { result } = this;
        let { consumed } = this;
        while (offset < inputLength) {
          const digit = input.charCodeAt(offset) - CharCodes.ZERO;
          if (digit >>> 0 > 9) {
            this.result = result;
            this.consumed = consumed;
            return this.emitNumericEntity(digit + CharCodes.ZERO, 2);
          }
          result = result * 10 + digit;
          consumed += 1;
          offset += 1;
        }
        this.result = result;
        this.consumed = consumed;
        return -1;
      }
      /**
       * Validate and emit a numeric entity.
       *
       * Implements the logic from the `Hexademical character reference start
       * state` and `Numeric character reference end state` in the HTML spec.
       * @param lastCp The last code point of the entity. Used to see if the
       *               entity was terminated with a semicolon.
       * @param expectedLength The minimum number of characters that should be
       *                       consumed. Used to validate that at least one digit
       *                       was consumed.
       * @returns The number of characters that were consumed.
       */
      emitNumericEntity(lastCp, expectedLength) {
        if (this.consumed <= expectedLength) {
          this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed);
          return 0;
        }
        if (lastCp === CharCodes.SEMI) {
          this.consumed += 1;
        } else if (this.decodeMode === DecodingMode.Strict) {
          return 0;
        }
        this.emitCodePoint((this.decodeTree === xmlDecodeTree ? replaceCodePointXML : replaceCodePoint)(this.result), this.consumed);
        if (this.errors) {
          if (lastCp !== CharCodes.SEMI) {
            this.errors.missingSemicolonAfterCharacterReference();
          }
          this.errors.validateNumericCharacterReference(this.result);
        }
        return this.consumed;
      }
      /**
       * Flush locally-tracked walk state back to the fields, then emit the
       * recorded legacy match or reject (cold path — at most once per
       * entity). Called after failed navigation (leaf node, branch miss, or
       * compact-run mismatch). In attribute mode, reject if no legacy was
       * recorded at the current node, if we descended past it, or if the
       * pending input character is an invalid attribute terminator.
       * @param consumed Locally-tracked consumed count.
       * @param excess Locally-tracked excess count.
       * @param char Pending input character (may be the mismatching char).
       * @param valueLength Value length at the current trie node.
       */
      flushAndEmitLegacyOrReject(consumed, excess, char, valueLength) {
        this.consumed = consumed;
        this.excess = excess;
        return this.result === 0 || this.decodeMode === DecodingMode.Attribute && (valueLength === 0 || excess > 1 || isEntityInAttributeInvalidEnd(char)) ? 0 : this.emitNotTerminatedNamedEntity();
      }
      /**
       * Parses a named entity.
       *
       * Equivalent to the `Named character reference state` in the HTML spec.
       * @param input The string containing the entity (or a continuation of the entity).
       * @param offset The current offset.
       * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
       */
      stateNamedEntity(input, offset) {
        const { decodeTree } = this;
        const inputLength = input.length;
        const isStrict = this.decodeMode === DecodingMode.Strict;
        let { treeIndex } = this;
        let { excess } = this;
        let { consumed } = this;
        let current = decodeTree[treeIndex];
        while (offset < inputLength) {
          while ((current & (BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13)) === 0 && (current & BinTrieFlags.JUMP_TABLE) !== 0) {
            const char2 = input.charCodeAt(offset);
            const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
            const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
            if (branchCount === 0) {
              if (char2 !== jumpOffset) {
                return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
              }
              treeIndex += 1;
            } else {
              const slot = char2 - jumpOffset;
              if (slot >>> 0 >= branchCount) {
                return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
              }
              const stored = decodeTree[treeIndex + 1 + slot];
              if (stored === 0) {
                return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
              }
              treeIndex = treeIndex + branchCount + stored & 65535;
            }
            current = decodeTree[treeIndex];
            offset += 1;
            excess += 1;
            if (offset >= inputLength)
              break;
          }
          if (offset >= inputLength)
            break;
          if ((current & (BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13)) === BinTrieFlags.FLAG13) {
            const runLength = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
            let { runConsumed } = this;
            if (runConsumed === 0) {
              const char2 = input.charCodeAt(offset);
              if (char2 !== (current & BinTrieFlags.JUMP_TABLE)) {
                return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
              }
              offset += 1;
              excess += 1;
              runConsumed = 1;
            }
            while (runConsumed < runLength) {
              if (offset >= inputLength) {
                this.treeIndex = treeIndex;
                this.excess = excess;
                this.consumed = consumed;
                this.runConsumed = runConsumed;
                return -1;
              }
              const charIndexInPacked = runConsumed - 1;
              const packedWord = decodeTree[treeIndex + 1 + (charIndexInPacked >> 1)];
              const expectedChar = packedWord >> ((charIndexInPacked & 1) << 3) & 255;
              const char2 = input.charCodeAt(offset);
              if (char2 !== expectedChar) {
                this.runConsumed = 0;
                return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
              }
              offset += 1;
              excess += 1;
              runConsumed += 1;
            }
            this.runConsumed = 0;
            treeIndex += 1 + (runLength >> 1);
            current = decodeTree[treeIndex];
            continue;
          }
          const valueLength = current >>> 14;
          const char = input.charCodeAt(offset);
          if (valueLength !== 0) {
            if (!isStrict && (current & BinTrieFlags.FLAG13) === 0) {
              this.result = treeIndex;
              consumed += excess - 1;
              excess = 1;
            }
            if (char === CharCodes.SEMI) {
              return this.emitNamedEntityData(treeIndex, valueLength, consumed + excess);
            }
            if (valueLength === 1) {
              return this.flushAndEmitLegacyOrReject(consumed, excess, char, valueLength);
            }
          }
          const next = determineBranch(decodeTree, current, treeIndex + (valueLength || 1), char);
          if (next < 0) {
            return this.flushAndEmitLegacyOrReject(consumed, excess, char, valueLength);
          }
          treeIndex = next;
          current = decodeTree[treeIndex];
          offset += 1;
          excess += 1;
        }
        if (!isStrict && current >>> 14 !== 0 && (current & BinTrieFlags.FLAG13) === 0) {
          this.result = treeIndex;
          consumed += excess - 1;
          excess = 1;
        }
        this.treeIndex = treeIndex;
        this.excess = excess;
        this.consumed = consumed;
        return -1;
      }
      /**
       * Emit a named entity that was not terminated with a semicolon.
       * @returns The number of characters consumed.
       */
      emitNotTerminatedNamedEntity() {
        const { result, decodeTree } = this;
        const valueLength = decodeTree[result] >>> 14;
        this.emitNamedEntityData(result, valueLength, this.consumed);
        this.errors?.missingSemicolonAfterCharacterReference();
        return this.consumed;
      }
      /**
       * Emit a named entity.
       * @param result The index of the entity in the decode tree.
       * @param valueLength Encoded value length (header plus any value words).
       * @param consumed The number of characters consumed.
       * @returns The number of characters consumed.
       */
      emitNamedEntityData(result, valueLength, consumed) {
        const { decodeTree } = this;
        this.emitCodePoint(valueLength === 1 ? decodeTree[result] & BinTrieFlags.VALUE_MASK : decodeTree[result + 1], consumed);
        if (valueLength === 3) {
          this.emitCodePoint(decodeTree[result + 2], consumed);
        }
        return consumed;
      }
      /**
       * Signal to the parser that the end of the input was reached.
       *
       * Remaining data will be emitted and relevant errors will be produced.
       * @returns The number of characters consumed.
       */
      end() {
        switch (this.state) {
          case EntityDecoderState.NamedEntity: {
            return this.result !== 0 && (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
          }
          // Otherwise, emit a numeric entity if we have one.
          case EntityDecoderState.NumericDecimal: {
            return this.emitNumericEntity(0, 2);
          }
          case EntityDecoderState.NumericHex: {
            return this.emitNumericEntity(0, 3);
          }
          case EntityDecoderState.NumericStart: {
            this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed);
            return 0;
          }
          default: {
            return 0;
          }
        }
      }
    };
  }
});

// node_modules/htmlparser2/dist/Tokenizer.js
function isWhitespace(c) {
  return c === CharCodes2.Space || c === CharCodes2.NewLine || c === CharCodes2.Tab || c === CharCodes2.FormFeed || c === CharCodes2.CarriageReturn;
}
function isEndOfTagSection(c) {
  return c === CharCodes2.Slash || c === CharCodes2.Gt || isWhitespace(c);
}
function isASCIIAlpha(c) {
  return c >= CharCodes2.LowerA && c <= CharCodes2.LowerZ || c >= CharCodes2.UpperA && c <= CharCodes2.UpperZ;
}
var CharCodes2, State, QuoteType, Sequences, specialStartSequences, Tokenizer;
var init_Tokenizer = __esm({
  "node_modules/htmlparser2/dist/Tokenizer.js"() {
    init_decode();
    (function(CharCodes3) {
      CharCodes3[CharCodes3["Tab"] = 9] = "Tab";
      CharCodes3[CharCodes3["NewLine"] = 10] = "NewLine";
      CharCodes3[CharCodes3["FormFeed"] = 12] = "FormFeed";
      CharCodes3[CharCodes3["CarriageReturn"] = 13] = "CarriageReturn";
      CharCodes3[CharCodes3["Space"] = 32] = "Space";
      CharCodes3[CharCodes3["ExclamationMark"] = 33] = "ExclamationMark";
      CharCodes3[CharCodes3["Number"] = 35] = "Number";
      CharCodes3[CharCodes3["Amp"] = 38] = "Amp";
      CharCodes3[CharCodes3["SingleQuote"] = 39] = "SingleQuote";
      CharCodes3[CharCodes3["DoubleQuote"] = 34] = "DoubleQuote";
      CharCodes3[CharCodes3["Dash"] = 45] = "Dash";
      CharCodes3[CharCodes3["Slash"] = 47] = "Slash";
      CharCodes3[CharCodes3["Zero"] = 48] = "Zero";
      CharCodes3[CharCodes3["Nine"] = 57] = "Nine";
      CharCodes3[CharCodes3["Semi"] = 59] = "Semi";
      CharCodes3[CharCodes3["Lt"] = 60] = "Lt";
      CharCodes3[CharCodes3["Eq"] = 61] = "Eq";
      CharCodes3[CharCodes3["Gt"] = 62] = "Gt";
      CharCodes3[CharCodes3["Questionmark"] = 63] = "Questionmark";
      CharCodes3[CharCodes3["UpperA"] = 65] = "UpperA";
      CharCodes3[CharCodes3["LowerA"] = 97] = "LowerA";
      CharCodes3[CharCodes3["UpperF"] = 70] = "UpperF";
      CharCodes3[CharCodes3["LowerF"] = 102] = "LowerF";
      CharCodes3[CharCodes3["UpperZ"] = 90] = "UpperZ";
      CharCodes3[CharCodes3["LowerZ"] = 122] = "LowerZ";
      CharCodes3[CharCodes3["LowerX"] = 120] = "LowerX";
      CharCodes3[CharCodes3["OpeningSquareBracket"] = 91] = "OpeningSquareBracket";
    })(CharCodes2 || (CharCodes2 = {}));
    (function(State2) {
      State2[State2["Text"] = 1] = "Text";
      State2[State2["BeforeTagName"] = 2] = "BeforeTagName";
      State2[State2["InTagName"] = 3] = "InTagName";
      State2[State2["InSelfClosingTag"] = 4] = "InSelfClosingTag";
      State2[State2["BeforeClosingTagName"] = 5] = "BeforeClosingTagName";
      State2[State2["InClosingTagName"] = 6] = "InClosingTagName";
      State2[State2["AfterClosingTagName"] = 7] = "AfterClosingTagName";
      State2[State2["BeforeAttributeName"] = 8] = "BeforeAttributeName";
      State2[State2["InAttributeName"] = 9] = "InAttributeName";
      State2[State2["AfterAttributeName"] = 10] = "AfterAttributeName";
      State2[State2["BeforeAttributeValue"] = 11] = "BeforeAttributeValue";
      State2[State2["InAttributeValueDq"] = 12] = "InAttributeValueDq";
      State2[State2["InAttributeValueSq"] = 13] = "InAttributeValueSq";
      State2[State2["InAttributeValueNq"] = 14] = "InAttributeValueNq";
      State2[State2["BeforeDeclaration"] = 15] = "BeforeDeclaration";
      State2[State2["InDeclaration"] = 16] = "InDeclaration";
      State2[State2["InProcessingInstruction"] = 17] = "InProcessingInstruction";
      State2[State2["BeforeComment"] = 18] = "BeforeComment";
      State2[State2["CDATASequence"] = 19] = "CDATASequence";
      State2[State2["DeclarationSequence"] = 20] = "DeclarationSequence";
      State2[State2["InSpecialComment"] = 21] = "InSpecialComment";
      State2[State2["InCommentLike"] = 22] = "InCommentLike";
      State2[State2["SpecialStartSequence"] = 23] = "SpecialStartSequence";
      State2[State2["InSpecialTag"] = 24] = "InSpecialTag";
      State2[State2["InPlainText"] = 25] = "InPlainText";
      State2[State2["InEntity"] = 26] = "InEntity";
    })(State || (State = {}));
    (function(QuoteType2) {
      QuoteType2[QuoteType2["NoValue"] = 0] = "NoValue";
      QuoteType2[QuoteType2["Unquoted"] = 1] = "Unquoted";
      QuoteType2[QuoteType2["Single"] = 2] = "Single";
      QuoteType2[QuoteType2["Double"] = 3] = "Double";
    })(QuoteType || (QuoteType = {}));
    Sequences = {
      Empty: new Uint8Array(0),
      Cdata: new Uint8Array([67, 68, 65, 84, 65, 91]),
      // CDATA[
      CdataEnd: new Uint8Array([93, 93, 62]),
      // ]]>
      CommentEnd: new Uint8Array([45, 45, 33, 62]),
      // `--!>`
      Doctype: new Uint8Array([100, 111, 99, 116, 121, 112, 101]),
      // `doctype`
      IframeEnd: new Uint8Array([60, 47, 105, 102, 114, 97, 109, 101]),
      // `</iframe`
      NoembedEnd: new Uint8Array([
        60,
        47,
        110,
        111,
        101,
        109,
        98,
        101,
        100
      ]),
      // `</noembed`
      NoframesEnd: new Uint8Array([
        60,
        47,
        110,
        111,
        102,
        114,
        97,
        109,
        101,
        115
      ]),
      // `</noframes`
      Plaintext: new Uint8Array([
        60,
        47,
        112,
        108,
        97,
        105,
        110,
        116,
        101,
        120,
        116
      ]),
      // `</plaintext`
      ScriptEnd: new Uint8Array([60, 47, 115, 99, 114, 105, 112, 116]),
      // `</script`
      StyleEnd: new Uint8Array([60, 47, 115, 116, 121, 108, 101]),
      // `</style`
      TitleEnd: new Uint8Array([60, 47, 116, 105, 116, 108, 101]),
      // `</title`
      TextareaEnd: new Uint8Array([
        60,
        47,
        116,
        101,
        120,
        116,
        97,
        114,
        101,
        97
      ]),
      // `</textarea`
      XmpEnd: new Uint8Array([60, 47, 120, 109, 112])
      // `</xmp`
    };
    specialStartSequences = /* @__PURE__ */ new Map([
      [Sequences.IframeEnd[2], Sequences.IframeEnd],
      [Sequences.NoembedEnd[2], Sequences.NoembedEnd],
      [Sequences.Plaintext[2], Sequences.Plaintext],
      [Sequences.ScriptEnd[2], Sequences.ScriptEnd],
      [Sequences.TitleEnd[2], Sequences.TitleEnd],
      [Sequences.XmpEnd[2], Sequences.XmpEnd]
    ]);
    Tokenizer = class {
      cbs;
      /** The current state the tokenizer is in. */
      state = State.Text;
      /** The read buffer. */
      buffer = "";
      /** The beginning of the section that is currently being read. */
      sectionStart = 0;
      /** The index within the buffer that we are currently looking at. */
      index = 0;
      /** The start of the last entity. */
      entityStart = 0;
      /** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
      baseState = State.Text;
      /** For special parsing behavior inside of script and style tags. */
      isSpecial = false;
      /** Indicates whether the tokenizer has been paused. */
      running = true;
      /** The offset of the current buffer. */
      offset = 0;
      xmlMode;
      decodeEntities;
      recognizeSelfClosing;
      entityDecoder;
      constructor({ xmlMode = false, decodeEntities = true, recognizeSelfClosing = xmlMode }, cbs) {
        this.cbs = cbs;
        this.xmlMode = xmlMode;
        this.decodeEntities = decodeEntities;
        this.recognizeSelfClosing = recognizeSelfClosing;
        this.entityDecoder = new EntityDecoder(xmlMode ? xmlDecodeTree : htmlDecodeTree, (cp, consumed) => this.emitCodePoint(cp, consumed));
      }
      reset() {
        this.state = State.Text;
        this.buffer = "";
        this.sectionStart = 0;
        this.index = 0;
        this.baseState = State.Text;
        this.isSpecial = false;
        this.currentSequence = Sequences.Empty;
        this.sequenceIndex = 0;
        this.running = true;
        this.offset = 0;
      }
      write(chunk) {
        this.offset += this.buffer.length;
        this.buffer = chunk;
        this.parse();
      }
      end() {
        if (this.running)
          this.finish();
      }
      pause() {
        this.running = false;
      }
      resume() {
        this.running = true;
        if (this.index < this.buffer.length + this.offset) {
          this.parse();
        }
      }
      stateText(c) {
        if (c === CharCodes2.Lt || !this.decodeEntities && this.fastForwardTo(CharCodes2.Lt)) {
          if (this.index > this.sectionStart) {
            this.cbs.ontext(this.sectionStart, this.index);
          }
          this.state = State.BeforeTagName;
          this.sectionStart = this.index;
        } else if (this.decodeEntities && c === CharCodes2.Amp) {
          this.startEntity();
        }
      }
      currentSequence = Sequences.Empty;
      sequenceIndex = 0;
      enterTagBody() {
        if (this.currentSequence === Sequences.Plaintext) {
          this.currentSequence = Sequences.Empty;
          this.state = State.InPlainText;
        } else if (this.isSpecial) {
          this.state = State.InSpecialTag;
          this.sequenceIndex = 0;
        } else {
          this.state = State.Text;
        }
      }
      /**
       * Match the opening tag name against an HTML text-only tag sequence.
       *
       * Some tags share an initial prefix (`script`/`style`, `title`/`textarea`,
       * `noembed`/`noframes`), so we may switch to an alternate sequence at the
       * first distinguishing byte.  On a successful full match we fall back to
       * the normal tag-name state; a later `>` will enter raw-text, RCDATA, or
       * plaintext mode based on `currentSequence` / `isSpecial`.
       * @param c Current character code point.
       */
      stateSpecialStartSequence(c) {
        const lower = c | 32;
        if (this.sequenceIndex < this.currentSequence.length) {
          if (lower === this.currentSequence[this.sequenceIndex]) {
            this.sequenceIndex++;
            return;
          }
          if (this.sequenceIndex === 3) {
            if (this.currentSequence === Sequences.ScriptEnd && lower === Sequences.StyleEnd[3]) {
              this.currentSequence = Sequences.StyleEnd;
              this.sequenceIndex = 4;
              return;
            }
            if (this.currentSequence === Sequences.TitleEnd && lower === Sequences.TextareaEnd[3]) {
              this.currentSequence = Sequences.TextareaEnd;
              this.sequenceIndex = 4;
              return;
            }
          } else if (this.sequenceIndex === 4 && this.currentSequence === Sequences.NoembedEnd && lower === Sequences.NoframesEnd[4]) {
            this.currentSequence = Sequences.NoframesEnd;
            this.sequenceIndex = 5;
            return;
          }
        } else if (isEndOfTagSection(c)) {
          this.sequenceIndex = 0;
          this.state = State.InTagName;
          this.stateInTagName(c);
          return;
        }
        this.isSpecial = false;
        this.currentSequence = Sequences.Empty;
        this.sequenceIndex = 0;
        this.state = State.InTagName;
        this.stateInTagName(c);
      }
      stateCDATASequence(c) {
        if (c === Sequences.Cdata[this.sequenceIndex]) {
          if (++this.sequenceIndex === Sequences.Cdata.length) {
            this.state = State.InCommentLike;
            this.currentSequence = Sequences.CdataEnd;
            this.sequenceIndex = 0;
            this.sectionStart = this.index + 1;
          }
        } else {
          this.sequenceIndex = 0;
          if (this.xmlMode) {
            this.state = State.InDeclaration;
            this.stateInDeclaration(c);
          } else {
            this.state = State.InSpecialComment;
            this.stateInSpecialComment(c);
          }
        }
      }
      /**
       * When we wait for one specific character, we can speed things up
       * by skipping through the buffer until we find it.
       * @param c Current character code point.
       * @returns Whether the character was found.
       */
      fastForwardTo(c) {
        while (++this.index < this.buffer.length + this.offset) {
          if (this.buffer.charCodeAt(this.index - this.offset) === c) {
            return true;
          }
        }
        this.index = this.buffer.length + this.offset - 1;
        return false;
      }
      /**
       * Emit a comment token and return to the text state.
       * @param offset Number of characters in the end sequence that have already been matched.
       */
      emitComment(offset) {
        this.cbs.oncomment(this.sectionStart, this.index, offset);
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
        this.state = State.Text;
      }
      /**
       * Comments and CDATA end with `-->` and `]]>`.
       *
       * Their common qualities are:
       * - Their end sequences have a distinct character they start with.
       * - That character is then repeated, so we have to check multiple repeats.
       * - All characters but the start character of the sequence can be skipped.
       * @param c Current character code point.
       */
      stateInCommentLike(c) {
        if (!this.xmlMode && this.currentSequence === Sequences.CommentEnd && this.sequenceIndex <= 1 && /*
         * We're still at the very start of the comment: the only
         * characters consumed since `<!--` are the dashes that
         * advanced sequenceIndex (0 for `<!-->`, 1 for `<!--->`).
         */
        this.index === this.sectionStart + this.sequenceIndex && c === CharCodes2.Gt) {
          this.emitComment(this.sequenceIndex);
        } else if (this.currentSequence === Sequences.CommentEnd && this.sequenceIndex === 2 && c === CharCodes2.Gt) {
          this.emitComment(2);
        } else if (this.currentSequence === Sequences.CommentEnd && this.sequenceIndex === this.currentSequence.length - 1 && c !== CharCodes2.Gt) {
          this.sequenceIndex = Number(c === CharCodes2.Dash);
        } else if (c === this.currentSequence[this.sequenceIndex]) {
          if (++this.sequenceIndex === this.currentSequence.length) {
            if (this.currentSequence === Sequences.CdataEnd) {
              this.cbs.oncdata(this.sectionStart, this.index, 2);
            } else {
              this.cbs.oncomment(this.sectionStart, this.index, 3);
            }
            this.sequenceIndex = 0;
            this.sectionStart = this.index + 1;
            this.state = State.Text;
          }
        } else if (this.sequenceIndex === 0) {
          if (this.fastForwardTo(this.currentSequence[0])) {
            this.sequenceIndex = 1;
          }
        } else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
          this.sequenceIndex = 0;
        }
      }
      /**
       * HTML only allows ASCII alpha characters (a-z and A-Z) at the beginning of a tag name.
       *
       * XML allows a lot more characters here (@see https://www.w3.org/TR/REC-xml/#NT-NameStartChar).
       * We allow anything that wouldn't end the tag.
       * @param c Current character code point.
       */
      isTagStartChar(c) {
        return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
      }
      /**
       * Scan raw-text / RCDATA content for the matching end tag.
       *
       * For RCDATA tags (`<title>`, `<textarea>`) entities are decoded inline.
       * For raw-text tags (`<script>`, `<style>`, etc.) we fast-forward to `<`.
       * @param c Current character code point.
       */
      stateInSpecialTag(c) {
        if (this.sequenceIndex === this.currentSequence.length) {
          if (isEndOfTagSection(c)) {
            const endOfText = this.index - this.currentSequence.length;
            if (this.sectionStart < endOfText) {
              const actualIndex = this.index;
              this.index = endOfText;
              this.cbs.ontext(this.sectionStart, endOfText);
              this.index = actualIndex;
            }
            this.isSpecial = false;
            this.sectionStart = endOfText + 2;
            this.stateInClosingTagName(c);
            return;
          }
          this.sequenceIndex = 0;
        }
        if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
          this.sequenceIndex += 1;
        } else if (this.sequenceIndex === 0) {
          if (this.currentSequence === Sequences.TitleEnd || this.currentSequence === Sequences.TextareaEnd) {
            if (this.decodeEntities && c === CharCodes2.Amp) {
              this.startEntity();
            }
          } else if (this.fastForwardTo(CharCodes2.Lt)) {
            this.sequenceIndex = 1;
          }
        } else {
          this.sequenceIndex = Number(c === CharCodes2.Lt);
        }
      }
      stateBeforeTagName(c) {
        if (c === CharCodes2.ExclamationMark) {
          this.state = State.BeforeDeclaration;
          this.sectionStart = this.index + 1;
        } else if (c === CharCodes2.Questionmark) {
          if (this.xmlMode) {
            this.state = State.InProcessingInstruction;
            this.sequenceIndex = 0;
            this.sectionStart = this.index + 1;
          } else {
            this.state = State.InSpecialComment;
            this.sectionStart = this.index;
          }
        } else if (this.isTagStartChar(c)) {
          this.sectionStart = this.index;
          const special = this.xmlMode || this.cbs.isInForeignContext?.() ? void 0 : specialStartSequences.get(c | 32);
          if (special === void 0) {
            this.state = State.InTagName;
          } else {
            this.isSpecial = true;
            this.currentSequence = special;
            this.sequenceIndex = 3;
            this.state = State.SpecialStartSequence;
          }
        } else if (c === CharCodes2.Slash) {
          this.state = State.BeforeClosingTagName;
        } else {
          this.state = State.Text;
          this.stateText(c);
        }
      }
      stateInTagName(c) {
        if (isEndOfTagSection(c)) {
          this.cbs.onopentagname(this.sectionStart, this.index);
          this.sectionStart = -1;
          this.state = State.BeforeAttributeName;
          this.stateBeforeAttributeName(c);
        }
      }
      stateBeforeClosingTagName(c) {
        if (isWhitespace(c)) {
          if (this.xmlMode) {
          } else {
            this.state = State.InSpecialComment;
            this.sectionStart = this.index;
          }
        } else if (c === CharCodes2.Gt) {
          this.state = State.Text;
          if (!this.xmlMode) {
            this.sectionStart = this.index + 1;
          }
        } else {
          this.state = this.isTagStartChar(c) ? State.InClosingTagName : State.InSpecialComment;
          this.sectionStart = this.index;
        }
      }
      stateInClosingTagName(c) {
        if (isEndOfTagSection(c)) {
          this.cbs.onclosetag(this.sectionStart, this.index);
          this.sectionStart = -1;
          this.state = State.AfterClosingTagName;
          this.stateAfterClosingTagName(c);
        }
      }
      stateAfterClosingTagName(c) {
        if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
          this.state = State.Text;
          this.sectionStart = this.index + 1;
        }
      }
      stateBeforeAttributeName(c) {
        if (c === CharCodes2.Gt) {
          this.cbs.onopentagend(this.index);
          this.enterTagBody();
          this.sectionStart = this.index + 1;
        } else if (c === CharCodes2.Slash) {
          this.state = State.InSelfClosingTag;
        } else if (!isWhitespace(c)) {
          this.state = State.InAttributeName;
          this.sectionStart = this.index;
        }
      }
      /**
       * Handle `/` before `>` in an opening tag.
       *
       * In HTML mode, text-only tags ignore the self-closing flag and still enter
       * their raw-text/RCDATA/plaintext state unless self-closing tags are being
       * recognized. In XML mode, or for ordinary tags, the tokenizer returns to
       * regular text parsing after emitting the self-closing callback.
       * @param c Current character code point.
       */
      stateInSelfClosingTag(c) {
        if (c === CharCodes2.Gt) {
          this.cbs.onselfclosingtag(this.index);
          this.sectionStart = this.index + 1;
          if (!this.recognizeSelfClosing) {
            this.enterTagBody();
            return;
          }
          this.state = State.Text;
          this.isSpecial = false;
          this.currentSequence = Sequences.Empty;
        } else if (!isWhitespace(c)) {
          this.state = State.BeforeAttributeName;
          this.stateBeforeAttributeName(c);
        }
      }
      stateInAttributeName(c) {
        if (c === CharCodes2.Eq || isEndOfTagSection(c)) {
          this.cbs.onattribname(this.sectionStart, this.index);
          this.sectionStart = this.index;
          this.state = State.AfterAttributeName;
          this.stateAfterAttributeName(c);
        }
      }
      stateAfterAttributeName(c) {
        if (c === CharCodes2.Eq) {
          this.state = State.BeforeAttributeValue;
        } else if (c === CharCodes2.Slash || c === CharCodes2.Gt) {
          this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
          this.sectionStart = -1;
          this.state = State.BeforeAttributeName;
          this.stateBeforeAttributeName(c);
        } else if (!isWhitespace(c)) {
          this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
          this.state = State.InAttributeName;
          this.sectionStart = this.index;
        }
      }
      stateBeforeAttributeValue(c) {
        if (c === CharCodes2.DoubleQuote) {
          this.state = State.InAttributeValueDq;
          this.sectionStart = this.index + 1;
        } else if (c === CharCodes2.SingleQuote) {
          this.state = State.InAttributeValueSq;
          this.sectionStart = this.index + 1;
        } else if (!isWhitespace(c)) {
          this.sectionStart = this.index;
          this.state = State.InAttributeValueNq;
          this.stateInAttributeValueNoQuotes(c);
        }
      }
      handleInAttributeValue(c, quote) {
        if (c === quote || !this.decodeEntities && this.fastForwardTo(quote)) {
          this.cbs.onattribdata(this.sectionStart, this.index);
          this.sectionStart = -1;
          this.cbs.onattribend(quote === CharCodes2.DoubleQuote ? QuoteType.Double : QuoteType.Single, this.index + 1);
          this.state = State.BeforeAttributeName;
        } else if (this.decodeEntities && c === CharCodes2.Amp) {
          this.startEntity();
        }
      }
      stateInAttributeValueDoubleQuotes(c) {
        this.handleInAttributeValue(c, CharCodes2.DoubleQuote);
      }
      stateInAttributeValueSingleQuotes(c) {
        this.handleInAttributeValue(c, CharCodes2.SingleQuote);
      }
      stateInAttributeValueNoQuotes(c) {
        if (isWhitespace(c) || c === CharCodes2.Gt) {
          this.cbs.onattribdata(this.sectionStart, this.index);
          this.sectionStart = -1;
          this.cbs.onattribend(QuoteType.Unquoted, this.index);
          this.state = State.BeforeAttributeName;
          this.stateBeforeAttributeName(c);
        } else if (this.decodeEntities && c === CharCodes2.Amp) {
          this.startEntity();
        }
      }
      /**
       * Distinguish between CDATA, declarations, HTML comments, and HTML bogus
       * comments after `<!`.
       *
       * In HTML mode, only real comments and doctypes stay on declaration paths;
       * everything else becomes a bogus comment terminated by the next `>`.
       * @param c Current character code point.
       */
      stateBeforeDeclaration(c) {
        if (c === CharCodes2.OpeningSquareBracket) {
          this.state = State.CDATASequence;
          this.sequenceIndex = 0;
        } else if (this.xmlMode) {
          this.state = c === CharCodes2.Dash ? State.BeforeComment : State.InDeclaration;
        } else if ((c | 32) === Sequences.Doctype[0]) {
          this.state = State.DeclarationSequence;
          this.currentSequence = Sequences.Doctype;
          this.sequenceIndex = 1;
        } else if (c === CharCodes2.Gt) {
          this.cbs.oncomment(this.sectionStart, this.index, 0);
          this.state = State.Text;
          this.sectionStart = this.index + 1;
        } else if (c === CharCodes2.Dash) {
          this.state = State.BeforeComment;
        } else {
          this.state = State.InSpecialComment;
        }
      }
      /**
       * Continue matching `doctype` after `<!d`.
       *
       * A full `doctype` match stays on the declaration path; any other name falls
       * back to an HTML bogus comment, which matches browser behavior for
       * non-doctype `<!...>` constructs.
       * @param c Current character code point.
       */
      stateDeclarationSequence(c) {
        if (this.sequenceIndex === this.currentSequence.length) {
          this.state = State.InDeclaration;
          this.stateInDeclaration(c);
        } else if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
          this.sequenceIndex += 1;
        } else if (c === CharCodes2.Gt) {
          this.cbs.oncomment(this.sectionStart, this.index, 0);
          this.state = State.Text;
          this.sectionStart = this.index + 1;
        } else {
          this.state = State.InSpecialComment;
        }
      }
      stateInDeclaration(c) {
        if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
          this.cbs.ondeclaration(this.sectionStart, this.index);
          this.state = State.Text;
          this.sectionStart = this.index + 1;
        }
      }
      /**
       * XML processing instructions (`<?...?>`).
       *
       * In HTML mode `<?` is routed to `InSpecialComment` instead, so this
       * state is only reachable in XML mode.
       * @param c Current character code point.
       */
      stateInProcessingInstruction(c) {
        if (c === CharCodes2.Questionmark) {
          this.sequenceIndex = 1;
        } else if (c === CharCodes2.Gt && this.sequenceIndex === 1) {
          this.cbs.onprocessinginstruction(this.sectionStart, this.index - 1);
          this.sequenceIndex = 0;
          this.state = State.Text;
          this.sectionStart = this.index + 1;
        } else {
          this.sequenceIndex = Number(this.fastForwardTo(CharCodes2.Questionmark));
        }
      }
      stateBeforeComment(c) {
        if (c === CharCodes2.Dash) {
          this.state = State.InCommentLike;
          this.currentSequence = Sequences.CommentEnd;
          this.sequenceIndex = 0;
          this.sectionStart = this.index + 1;
        } else if (this.xmlMode) {
          this.state = State.InDeclaration;
        } else if (c === CharCodes2.Gt) {
          this.cbs.oncomment(this.sectionStart, this.index, 0);
          this.state = State.Text;
          this.sectionStart = this.index + 1;
        } else {
          this.state = State.InSpecialComment;
        }
      }
      stateInSpecialComment(c) {
        if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
          this.cbs.oncomment(this.sectionStart, this.index, 0);
          this.state = State.Text;
          this.sectionStart = this.index + 1;
        }
      }
      startEntity() {
        this.baseState = this.state;
        this.state = State.InEntity;
        this.entityStart = this.index;
        this.entityDecoder.startEntity(this.xmlMode ? DecodingMode.Strict : this.baseState === State.Text || this.baseState === State.InSpecialTag ? DecodingMode.Legacy : DecodingMode.Attribute);
      }
      stateInEntity() {
        const indexInBuffer = this.index - this.offset;
        const length = this.entityDecoder.write(this.buffer, indexInBuffer);
        if (length >= 0) {
          this.state = this.baseState;
          if (length === 0) {
            this.index -= 1;
          }
        } else {
          if (indexInBuffer < this.buffer.length && this.buffer.charCodeAt(indexInBuffer) === CharCodes2.Amp) {
            this.state = this.baseState;
            this.index -= 1;
            return;
          }
          this.index = this.offset + this.buffer.length - 1;
        }
      }
      /**
       * Remove data that has already been consumed from the buffer.
       */
      cleanup() {
        if (this.running && this.sectionStart !== this.index) {
          if (this.state === State.Text || this.state === State.InPlainText || this.state === State.InSpecialTag && this.sequenceIndex === 0) {
            this.cbs.ontext(this.sectionStart, this.index);
            this.sectionStart = this.index;
          } else if (this.state === State.InAttributeValueDq || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueNq) {
            this.cbs.onattribdata(this.sectionStart, this.index);
            this.sectionStart = this.index;
          }
        }
      }
      shouldContinue() {
        return this.index < this.buffer.length + this.offset && this.running;
      }
      /**
       * Iterates through the buffer, calling the function corresponding to the current state.
       *
       * States that are more likely to be hit are higher up, as a performance improvement.
       */
      parse() {
        while (this.shouldContinue()) {
          const c = this.buffer.charCodeAt(this.index - this.offset);
          switch (this.state) {
            case State.Text: {
              this.stateText(c);
              break;
            }
            case State.InPlainText: {
              this.index = this.buffer.length + this.offset - 1;
              break;
            }
            case State.SpecialStartSequence: {
              this.stateSpecialStartSequence(c);
              break;
            }
            case State.InSpecialTag: {
              this.stateInSpecialTag(c);
              break;
            }
            case State.CDATASequence: {
              this.stateCDATASequence(c);
              break;
            }
            case State.DeclarationSequence: {
              this.stateDeclarationSequence(c);
              break;
            }
            case State.InAttributeValueDq: {
              this.stateInAttributeValueDoubleQuotes(c);
              break;
            }
            case State.InAttributeName: {
              this.stateInAttributeName(c);
              break;
            }
            case State.InCommentLike: {
              this.stateInCommentLike(c);
              break;
            }
            case State.InSpecialComment: {
              this.stateInSpecialComment(c);
              break;
            }
            case State.BeforeAttributeName: {
              this.stateBeforeAttributeName(c);
              break;
            }
            case State.InTagName: {
              this.stateInTagName(c);
              break;
            }
            case State.InClosingTagName: {
              this.stateInClosingTagName(c);
              break;
            }
            case State.BeforeTagName: {
              this.stateBeforeTagName(c);
              break;
            }
            case State.AfterAttributeName: {
              this.stateAfterAttributeName(c);
              break;
            }
            case State.InAttributeValueSq: {
              this.stateInAttributeValueSingleQuotes(c);
              break;
            }
            case State.BeforeAttributeValue: {
              this.stateBeforeAttributeValue(c);
              break;
            }
            case State.BeforeClosingTagName: {
              this.stateBeforeClosingTagName(c);
              break;
            }
            case State.AfterClosingTagName: {
              this.stateAfterClosingTagName(c);
              break;
            }
            case State.InAttributeValueNq: {
              this.stateInAttributeValueNoQuotes(c);
              break;
            }
            case State.InSelfClosingTag: {
              this.stateInSelfClosingTag(c);
              break;
            }
            case State.InDeclaration: {
              this.stateInDeclaration(c);
              break;
            }
            case State.BeforeDeclaration: {
              this.stateBeforeDeclaration(c);
              break;
            }
            case State.BeforeComment: {
              this.stateBeforeComment(c);
              break;
            }
            case State.InProcessingInstruction: {
              this.stateInProcessingInstruction(c);
              break;
            }
            case State.InEntity: {
              this.stateInEntity();
              break;
            }
          }
          this.index++;
        }
        this.cleanup();
      }
      finish() {
        if (this.state === State.InEntity) {
          this.entityDecoder.end();
          this.state = this.baseState;
        }
        this.handleTrailingData();
        this.cbs.onend();
      }
      handleTrailingCommentLikeData(endIndex) {
        if (this.state !== State.InCommentLike) {
          return false;
        }
        if (this.currentSequence === Sequences.CdataEnd) {
          if (this.xmlMode) {
            if (this.sectionStart < endIndex) {
              this.cbs.oncdata(this.sectionStart, endIndex, 0);
            }
          } else {
            const cdataStart = this.sectionStart - Sequences.Cdata.length - 1;
            this.cbs.oncomment(cdataStart, endIndex, 0);
          }
        } else {
          const offset = this.xmlMode ? 0 : Math.min(this.sequenceIndex, Sequences.CommentEnd.length - 1);
          this.cbs.oncomment(this.sectionStart, endIndex, offset);
        }
        return true;
      }
      handleTrailingMarkupDeclaration(endIndex) {
        if (this.xmlMode) {
          switch (this.state) {
            case State.InSpecialComment:
            case State.BeforeComment:
            case State.CDATASequence:
            case State.DeclarationSequence:
            case State.InDeclaration: {
              this.cbs.ontext(this.sectionStart, endIndex);
              return true;
            }
            default: {
              return false;
            }
          }
        }
        switch (this.state) {
          case State.BeforeDeclaration:
          case State.InSpecialComment:
          case State.BeforeComment:
          case State.CDATASequence: {
            this.cbs.oncomment(this.sectionStart, endIndex, 0);
            return true;
          }
          case State.DeclarationSequence: {
            if (this.sequenceIndex !== Sequences.Doctype.length) {
              this.cbs.oncomment(this.sectionStart, endIndex, 0);
            }
            return true;
          }
          case State.InDeclaration: {
            return true;
          }
          default: {
            return false;
          }
        }
      }
      /** Handle any trailing data. */
      handleTrailingData() {
        const endIndex = this.buffer.length + this.offset;
        if (this.handleTrailingCommentLikeData(endIndex) || this.handleTrailingMarkupDeclaration(endIndex)) {
          return;
        }
        if (this.sectionStart >= endIndex) {
          return;
        }
        switch (this.state) {
          case State.InTagName:
          case State.BeforeAttributeName:
          case State.BeforeAttributeValue:
          case State.AfterAttributeName:
          case State.InAttributeName:
          case State.InAttributeValueSq:
          case State.InAttributeValueDq:
          case State.InAttributeValueNq:
          case State.InClosingTagName: {
            break;
          }
          default: {
            this.cbs.ontext(this.sectionStart, endIndex);
          }
        }
      }
      emitCodePoint(cp, consumed) {
        if (this.baseState !== State.Text && this.baseState !== State.InSpecialTag) {
          if (this.sectionStart < this.entityStart) {
            this.cbs.onattribdata(this.sectionStart, this.entityStart);
          }
          this.sectionStart = this.entityStart + consumed;
          this.index = this.sectionStart - 1;
          this.cbs.onattribentity(cp);
        } else {
          if (this.sectionStart < this.entityStart) {
            this.cbs.ontext(this.sectionStart, this.entityStart);
          }
          this.sectionStart = this.entityStart + consumed;
          this.index = this.sectionStart - 1;
          this.cbs.ontextentity(cp, this.sectionStart);
        }
      }
    };
  }
});

// node_modules/htmlparser2/dist/Parser.js
var fromCodePoint, formTags, pTag, headingTags, tableSectionTags, ddtTags, rtpTags, openImpliesClose, DOCUMENT_TYPE, voidElements, foreignContextElements, htmlIntegrationElements, svgTagNameAdjustments, ForeignContext, reNameEnd, Parser;
var init_Parser = __esm({
  "node_modules/htmlparser2/dist/Parser.js"() {
    init_Tokenizer();
    ({ fromCodePoint } = String);
    formTags = /* @__PURE__ */ new Set([
      "input",
      "option",
      "optgroup",
      "select",
      "button",
      "datalist",
      "textarea"
    ]);
    pTag = /* @__PURE__ */ new Set(["p"]);
    headingTags = /* @__PURE__ */ new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p"]);
    tableSectionTags = /* @__PURE__ */ new Set(["thead", "tbody"]);
    ddtTags = /* @__PURE__ */ new Set(["dd", "dt"]);
    rtpTags = /* @__PURE__ */ new Set(["rt", "rp"]);
    openImpliesClose = /* @__PURE__ */ new Map([
      ["tr", /* @__PURE__ */ new Set(["tr", "th", "td"])],
      ["th", /* @__PURE__ */ new Set(["th"])],
      ["td", /* @__PURE__ */ new Set(["thead", "th", "td"])],
      ["body", /* @__PURE__ */ new Set(["head", "link", "script"])],
      ["a", /* @__PURE__ */ new Set(["a"])],
      ["li", /* @__PURE__ */ new Set(["li"])],
      ["p", pTag],
      ["h1", headingTags],
      ["h2", headingTags],
      ["h3", headingTags],
      ["h4", headingTags],
      ["h5", headingTags],
      ["h6", headingTags],
      ["select", formTags],
      ["input", formTags],
      ["output", formTags],
      ["button", formTags],
      ["datalist", formTags],
      ["textarea", formTags],
      ["option", /* @__PURE__ */ new Set(["option"])],
      ["optgroup", /* @__PURE__ */ new Set(["optgroup", "option"])],
      ["dd", ddtTags],
      ["dt", ddtTags],
      ["address", pTag],
      ["article", pTag],
      ["aside", pTag],
      ["blockquote", pTag],
      ["details", pTag],
      ["div", pTag],
      ["dl", pTag],
      ["fieldset", pTag],
      ["figcaption", pTag],
      ["figure", pTag],
      ["footer", pTag],
      ["form", pTag],
      ["header", pTag],
      ["hr", pTag],
      ["main", pTag],
      ["nav", pTag],
      ["ol", pTag],
      ["pre", pTag],
      ["section", pTag],
      ["table", pTag],
      ["ul", pTag],
      ["rt", rtpTags],
      ["rp", rtpTags],
      ["tbody", tableSectionTags],
      ["tfoot", tableSectionTags]
    ]);
    DOCUMENT_TYPE = "doctype";
    voidElements = /* @__PURE__ */ new Set([
      "area",
      "base",
      "basefont",
      "br",
      "col",
      "command",
      "embed",
      "frame",
      "hr",
      "img",
      "input",
      "isindex",
      "keygen",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr"
    ]);
    foreignContextElements = /* @__PURE__ */ new Set(["math", "svg"]);
    htmlIntegrationElements = /* @__PURE__ */ new Set([
      "mi",
      "mo",
      "mn",
      "ms",
      "mtext",
      "annotation-xml",
      "foreignObject",
      "desc",
      "title"
    ]);
    svgTagNameAdjustments = /* @__PURE__ */ new Map([
      ["altglyph", "altGlyph"],
      ["altglyphdef", "altGlyphDef"],
      ["altglyphitem", "altGlyphItem"],
      ["animatecolor", "animateColor"],
      ["animatemotion", "animateMotion"],
      ["animatetransform", "animateTransform"],
      ["clippath", "clipPath"],
      ["feblend", "feBlend"],
      ["fecolormatrix", "feColorMatrix"],
      ["fecomponenttransfer", "feComponentTransfer"],
      ["fecomposite", "feComposite"],
      ["feconvolvematrix", "feConvolveMatrix"],
      ["fediffuselighting", "feDiffuseLighting"],
      ["fedisplacementmap", "feDisplacementMap"],
      ["fedistantlight", "feDistantLight"],
      ["fedropshadow", "feDropShadow"],
      ["feflood", "feFlood"],
      ["fefunca", "feFuncA"],
      ["fefuncb", "feFuncB"],
      ["fefuncg", "feFuncG"],
      ["fefuncr", "feFuncR"],
      ["fegaussianblur", "feGaussianBlur"],
      ["feimage", "feImage"],
      ["femerge", "feMerge"],
      ["femergenode", "feMergeNode"],
      ["femorphology", "feMorphology"],
      ["feoffset", "feOffset"],
      ["fepointlight", "fePointLight"],
      ["fespecularlighting", "feSpecularLighting"],
      ["fespotlight", "feSpotLight"],
      ["fetile", "feTile"],
      ["feturbulence", "feTurbulence"],
      ["foreignobject", "foreignObject"],
      ["glyphref", "glyphRef"],
      ["lineargradient", "linearGradient"],
      ["radialgradient", "radialGradient"],
      ["textpath", "textPath"]
    ]);
    (function(ForeignContext2) {
      ForeignContext2[ForeignContext2["None"] = 0] = "None";
      ForeignContext2[ForeignContext2["Svg"] = 1] = "Svg";
      ForeignContext2[ForeignContext2["MathML"] = 2] = "MathML";
    })(ForeignContext || (ForeignContext = {}));
    reNameEnd = /\s|\//;
    Parser = class {
      options;
      /** The start index of the last event. */
      startIndex = 0;
      /** The end index of the last event. */
      endIndex = 0;
      /**
       * Store the start index of the current open tag,
       * so we can update the start index for attributes.
       */
      openTagStart = 0;
      tagname = "";
      attribname = "";
      attribvalue = "";
      attribs = null;
      stack = [];
      foreignContext;
      cbs;
      lowerCaseTagNames;
      lowerCaseAttributeNames;
      recognizeSelfClosing;
      /** We are parsing HTML. Inverse of the `xmlMode` option. */
      htmlMode;
      tokenizer;
      buffers = [];
      bufferOffset = 0;
      /** The index of the last written buffer. Used when resuming after a `pause()`. */
      writeIndex = 0;
      /** Indicates whether the parser has finished running / `.end` has been called. */
      ended = false;
      constructor(cbs, options = {}) {
        this.options = options;
        this.cbs = cbs ?? {};
        this.htmlMode = !this.options.xmlMode;
        this.lowerCaseTagNames = options.lowerCaseTags ?? this.htmlMode;
        this.lowerCaseAttributeNames = options.lowerCaseAttributeNames ?? this.htmlMode;
        this.recognizeSelfClosing = options.recognizeSelfClosing ?? !this.htmlMode;
        this.tokenizer = new (options.Tokenizer ?? Tokenizer)(this.options, this);
        this.foreignContext = [ForeignContext.None];
        this.cbs.onparserinit?.(this);
      }
      // Tokenizer event handlers
      /**
       * @param start Start index for the current parser event.
       * @param endIndex End index for the current parser event.
       * @internal
       */
      ontext(start, endIndex) {
        const data = this.getSlice(start, endIndex);
        this.endIndex = endIndex - 1;
        this.cbs.ontext?.(data);
        this.startIndex = endIndex;
      }
      /**
       * @param cp Current Unicode code point.
       * @param endIndex End index for the current parser event.
       * @internal
       */
      ontextentity(cp, endIndex) {
        this.endIndex = endIndex - 1;
        this.cbs.ontext?.(fromCodePoint(cp));
        this.startIndex = endIndex;
      }
      /** @internal */
      isInForeignContext() {
        return this.foreignContext[0] !== ForeignContext.None;
      }
      /**
       * Checks if the current tag is a void element. Override this if you want
       * to specify your own additional void elements.
       * @param name Name of the pseudo selector.
       */
      isVoidElement(name) {
        return this.htmlMode && voidElements.has(name);
      }
      /**
       * Read a tag name from the buffer.
       *
       * When `lowerCaseTagNames` is enabled (the default in HTML mode), the name
       * is lowercased and may be adjusted for SVG casing or the `image` → `img`
       * alias.
       * @param start Start index of the tag name in the buffer.
       * @param endIndex End index of the tag name in the buffer.
       */
      readTagName(start, endIndex) {
        const name = this.lowerCaseTagNames ? this.getSlice(start, endIndex).toLowerCase() : this.getSlice(start, endIndex);
        if (!(this.lowerCaseTagNames && this.htmlMode)) {
          return name;
        }
        if (this.foreignContext[0] === ForeignContext.Svg) {
          return svgTagNameAdjustments.get(name) ?? name;
        }
        if (this.foreignContext.length > 1) {
          const adjusted = svgTagNameAdjustments.get(name);
          if (adjusted !== void 0 && this.stack.includes(adjusted)) {
            return adjusted;
          }
        }
        if (!this.isInForeignContext()) {
          return name === "image" ? "img" : name;
        }
        return name;
      }
      /**
       * @param start Start index for the current parser event.
       * @param endIndex End index for the current parser event.
       * @internal
       */
      onopentagname(start, endIndex) {
        this.endIndex = endIndex;
        this.emitOpenTag(this.readTagName(start, endIndex));
      }
      emitOpenTag(name) {
        this.openTagStart = this.startIndex;
        this.tagname = name;
        if (this.htmlMode && name === "form" && this.stack.includes("form")) {
          this.tagname = "";
          return;
        }
        const impliesClose = this.htmlMode && openImpliesClose.get(name);
        if (impliesClose) {
          while (this.stack.length > 0 && impliesClose.has(this.stack[0])) {
            this.popElement(true);
          }
        }
        if (!this.isVoidElement(name)) {
          this.stack.unshift(name);
          if (this.htmlMode) {
            if (name === "svg") {
              this.foreignContext.unshift(ForeignContext.Svg);
            } else if (name === "math") {
              this.foreignContext.unshift(ForeignContext.MathML);
            } else if (htmlIntegrationElements.has(name)) {
              this.foreignContext.unshift(ForeignContext.None);
            }
          }
        }
        this.cbs.onopentagname?.(name);
        if (this.cbs.onopentag)
          this.attribs = {};
      }
      endOpenTag(isImplied) {
        this.startIndex = this.openTagStart;
        if (this.attribs) {
          this.cbs.onopentag?.(this.tagname, this.attribs, isImplied);
          this.attribs = null;
        }
        if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
          this.cbs.onclosetag(this.tagname, true);
        }
        this.tagname = "";
      }
      /**
       * @param endIndex End index for the current parser event.
       * @internal
       */
      onopentagend(endIndex) {
        this.endIndex = endIndex;
        this.endOpenTag(false);
        this.startIndex = endIndex + 1;
      }
      /**
       * @param start Start index for the current parser event.
       * @param endIndex End index for the current parser event.
       * @internal
       */
      onclosetag(start, endIndex) {
        this.endIndex = endIndex;
        const name = this.readTagName(start, endIndex);
        if (!this.isVoidElement(name)) {
          const pos = this.stack.indexOf(name);
          if (pos !== -1) {
            for (let index = 0; index < pos; index++) {
              this.popElement(true);
            }
            this.popElement(false);
          } else if (this.htmlMode && name === "p") {
            this.emitOpenTag("p");
            this.closeCurrentTag(true);
          }
        } else if (this.htmlMode && name === "br") {
          this.cbs.onopentagname?.("br");
          this.cbs.onopentag?.("br", {}, true);
          this.cbs.onclosetag?.("br", false);
        }
        this.startIndex = endIndex + 1;
      }
      /**
       * @param endIndex End index for the current parser event.
       * @internal
       */
      onselfclosingtag(endIndex) {
        this.endIndex = endIndex;
        if (this.recognizeSelfClosing || this.isInForeignContext()) {
          this.closeCurrentTag(false);
          this.startIndex = endIndex + 1;
        } else {
          this.onopentagend(endIndex);
        }
      }
      /**
       * Pop the top element off the stack, emit a close event, and maintain
       * the foreign context stack.
       * @param implied Whether this close is implied (not from an explicit end tag).
       */
      popElement(implied) {
        const element = this.stack.shift();
        if (this.htmlMode && (foreignContextElements.has(element) || htmlIntegrationElements.has(element))) {
          this.foreignContext.shift();
        }
        this.cbs.onclosetag?.(element, implied);
      }
      closeCurrentTag(isOpenImplied) {
        const name = this.tagname;
        this.endOpenTag(isOpenImplied);
        if (this.stack[0] === name) {
          this.popElement(!isOpenImplied);
        }
      }
      /**
       * @param start Start index for the current parser event.
       * @param endIndex End index for the current parser event.
       * @internal
       */
      onattribname(start, endIndex) {
        this.startIndex = start;
        const name = this.getSlice(start, endIndex);
        this.attribname = this.lowerCaseAttributeNames ? name.toLowerCase() : name;
      }
      /**
       * @param start Start index for the current parser event.
       * @param endIndex End index for the current parser event.
       * @internal
       */
      onattribdata(start, endIndex) {
        this.attribvalue += this.getSlice(start, endIndex);
      }
      /**
       * @param cp Current Unicode code point.
       * @internal
       */
      onattribentity(cp) {
        this.attribvalue += fromCodePoint(cp);
      }
      /**
       * @param quote Quote type used for the current attribute.
       * @param endIndex End index for the current parser event.
       * @internal
       */
      onattribend(quote, endIndex) {
        this.endIndex = endIndex;
        this.cbs.onattribute?.(this.attribname, this.attribvalue, quote === QuoteType.Double ? '"' : quote === QuoteType.Single ? "'" : quote === QuoteType.NoValue ? void 0 : null);
        if (this.attribs && !Object.hasOwn(this.attribs, this.attribname)) {
          this.attribs[this.attribname] = this.attribvalue;
        }
        this.attribvalue = "";
      }
      getInstructionName(value) {
        const index = value.search(reNameEnd);
        let name = index < 0 ? value : value.substr(0, index);
        if (this.lowerCaseTagNames) {
          name = name.toLowerCase();
        }
        return name;
      }
      /**
       * @param start Start index for the current parser event.
       * @param endIndex End index for the current parser event.
       * @internal
       */
      ondeclaration(start, endIndex) {
        this.endIndex = endIndex;
        const value = this.getSlice(start, endIndex);
        if (this.cbs.onprocessinginstruction) {
          const name = this.htmlMode ? this.lowerCaseTagNames ? DOCUMENT_TYPE : value.slice(0, DOCUMENT_TYPE.length) : this.getInstructionName(value);
          this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
        }
        this.startIndex = endIndex + 1;
      }
      /**
       * @param start Start index for the current parser event.
       * @param endIndex End index for the current parser event.
       * @internal
       */
      onprocessinginstruction(start, endIndex) {
        this.endIndex = endIndex;
        const value = this.getSlice(start, endIndex);
        if (this.cbs.onprocessinginstruction) {
          const name = this.getInstructionName(value);
          this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
        }
        this.startIndex = endIndex + 1;
      }
      /**
       * @param start Start index for the current parser event.
       * @param endIndex End index for the current parser event.
       * @param offset Offset applied when computing parser indices.
       * @internal
       */
      oncomment(start, endIndex, offset) {
        this.endIndex = endIndex;
        this.cbs.oncomment?.(this.getSlice(start, endIndex - offset));
        this.cbs.oncommentend?.();
        this.startIndex = endIndex + 1;
      }
      /**
       * @param start Start index for the current parser event.
       * @param endIndex End index for the current parser event.
       * @param offset Offset applied when computing parser indices.
       * @internal
       */
      oncdata(start, endIndex, offset) {
        this.endIndex = endIndex;
        const value = this.getSlice(start, endIndex - offset);
        if (!this.htmlMode || this.options.recognizeCDATA) {
          this.cbs.oncdatastart?.();
          this.cbs.ontext?.(value);
          this.cbs.oncdataend?.();
        } else if (this.isInForeignContext()) {
          this.cbs.ontext?.(value);
        } else {
          this.cbs.oncomment?.(`[CDATA[${value}]]`);
          this.cbs.oncommentend?.();
        }
        this.startIndex = endIndex + 1;
      }
      /** @internal */
      onend() {
        if (this.cbs.onclosetag) {
          this.endIndex = this.startIndex;
          for (let index = 0; index < this.stack.length; index++) {
            this.cbs.onclosetag(this.stack[index], true);
          }
        }
        this.cbs.onend?.();
      }
      /**
       * Resets the parser to a blank state, ready to parse a new HTML document
       */
      reset() {
        this.cbs.onreset?.();
        this.tokenizer.reset();
        this.tagname = "";
        this.attribname = "";
        this.attribvalue = "";
        this.attribs = null;
        this.stack.length = 0;
        this.startIndex = 0;
        this.endIndex = 0;
        this.cbs.onparserinit?.(this);
        this.buffers.length = 0;
        this.foreignContext.length = 0;
        this.foreignContext.unshift(ForeignContext.None);
        this.bufferOffset = 0;
        this.writeIndex = 0;
        this.ended = false;
      }
      /**
       * Resets the parser, then parses a complete document and
       * pushes it to the handler.
       * @param data Document to parse.
       */
      parseComplete(data) {
        this.reset();
        this.end(data);
      }
      getSlice(start, end) {
        if (start === end) {
          return "";
        }
        while (start - this.bufferOffset >= this.buffers[0].length) {
          this.shiftBuffer();
        }
        let slice = this.buffers[0].slice(start - this.bufferOffset, end - this.bufferOffset);
        while (end - this.bufferOffset > this.buffers[0].length) {
          this.shiftBuffer();
          slice += this.buffers[0].slice(0, end - this.bufferOffset);
        }
        return slice;
      }
      shiftBuffer() {
        this.bufferOffset += this.buffers[0].length;
        this.writeIndex--;
        this.buffers.shift();
      }
      /**
       * Parses a chunk of data and calls the corresponding callbacks.
       * @param chunk Chunk to parse.
       */
      write(chunk) {
        if (this.ended) {
          this.cbs.onerror?.(new Error(".write() after done!"));
          return;
        }
        this.buffers.push(chunk);
        if (this.tokenizer.running) {
          this.tokenizer.write(chunk);
          this.writeIndex++;
        }
      }
      /**
       * Parses the end of the buffer and clears the stack, calls onend.
       * @param chunk Optional final chunk to parse.
       */
      end(chunk) {
        if (this.ended) {
          this.cbs.onerror?.(new Error(".end() after done!"));
          return;
        }
        if (chunk)
          this.write(chunk);
        this.ended = true;
        this.tokenizer.end();
      }
      /**
       * Pauses parsing. The parser won't emit events until `resume` is called.
       */
      pause() {
        this.tokenizer.pause();
      }
      /**
       * Resumes parsing after `pause` was called.
       */
      resume() {
        this.tokenizer.resume();
        while (this.tokenizer.running && this.writeIndex < this.buffers.length) {
          this.tokenizer.write(this.buffers[this.writeIndex++]);
        }
        if (this.ended)
          this.tokenizer.end();
      }
    };
  }
});

// node_modules/domelementtype/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  CDATA: () => CDATA,
  Comment: () => Comment,
  Directive: () => Directive,
  Doctype: () => Doctype,
  ElementType: () => ElementType,
  Root: () => Root,
  Script: () => Script,
  Style: () => Style,
  Tag: () => Tag,
  Text: () => Text,
  isTag: () => isTag
});
function isTag(element) {
  return element.type === ElementType.Tag || element.type === ElementType.Script || element.type === ElementType.Style;
}
var ElementType, Root, Text, Directive, Comment, Script, Style, Tag, CDATA, Doctype;
var init_dist = __esm({
  "node_modules/domelementtype/dist/index.js"() {
    (function(ElementType2) {
      ElementType2["Root"] = "root";
      ElementType2["Text"] = "text";
      ElementType2["Directive"] = "directive";
      ElementType2["Comment"] = "comment";
      ElementType2["Script"] = "script";
      ElementType2["Style"] = "style";
      ElementType2["Tag"] = "tag";
      ElementType2["CDATA"] = "cdata";
      ElementType2["Doctype"] = "doctype";
    })(ElementType || (ElementType = {}));
    Root = ElementType.Root;
    Text = ElementType.Text;
    Directive = ElementType.Directive;
    Comment = ElementType.Comment;
    Script = ElementType.Script;
    Style = ElementType.Style;
    Tag = ElementType.Tag;
    CDATA = ElementType.CDATA;
    Doctype = ElementType.Doctype;
  }
});

// node_modules/domhandler/dist/node.js
function isTag2(node) {
  return isTag(node);
}
function isCDATA(node) {
  return node.type === ElementType.CDATA;
}
function isText(node) {
  return node.type === ElementType.Text;
}
function isComment(node) {
  return node.type === ElementType.Comment;
}
function isDirective(node) {
  return node.type === ElementType.Directive;
}
function isDocument(node) {
  return node.type === ElementType.Root;
}
function hasChildren(node) {
  return Object.hasOwn(node, "children");
}
function cloneNode(node, recursive = false) {
  let result;
  if (isText(node)) {
    result = new Text2(node.data);
  } else if (isComment(node)) {
    result = new Comment2(node.data);
  } else if (isTag2(node)) {
    const children = recursive ? cloneChildren(node.children) : [];
    const clone = new Element(node.name, { ...node.attribs }, children);
    for (const child of children) {
      child.parent = clone;
    }
    if (node.namespace != null) {
      clone.namespace = node.namespace;
    }
    if (node["x-attribsNamespace"]) {
      clone["x-attribsNamespace"] = { ...node["x-attribsNamespace"] };
    }
    if (node["x-attribsPrefix"]) {
      clone["x-attribsPrefix"] = { ...node["x-attribsPrefix"] };
    }
    result = clone;
  } else if (isCDATA(node)) {
    const children = recursive ? cloneChildren(node.children) : [];
    const clone = new CDATA2(children);
    for (const child of children) {
      child.parent = clone;
    }
    result = clone;
  } else if (isDocument(node)) {
    const children = recursive ? cloneChildren(node.children) : [];
    const clone = new Document(children);
    for (const child of children) {
      child.parent = clone;
    }
    if (node["x-mode"]) {
      clone["x-mode"] = node["x-mode"];
    }
    result = clone;
  } else if (isDirective(node)) {
    const instruction = new ProcessingInstruction(node.name, node.data);
    if (node["x-name"] != null) {
      instruction["x-name"] = node["x-name"];
      instruction["x-publicId"] = node["x-publicId"];
      instruction["x-systemId"] = node["x-systemId"];
    }
    result = instruction;
  } else {
    throw new Error(`Not implemented yet: ${node.type}`);
  }
  result.startIndex = node.startIndex;
  result.endIndex = node.endIndex;
  if (node.sourceCodeLocation != null) {
    result.sourceCodeLocation = node.sourceCodeLocation;
  }
  return result;
}
function cloneChildren(childs) {
  const children = childs.map((child) => cloneNode(child, true));
  for (let index = 1; index < children.length; index++) {
    children[index].prev = children[index - 1];
    children[index - 1].next = children[index];
  }
  return children;
}
var Node, DataNode, Text2, Comment2, ProcessingInstruction, NodeWithChildren, CDATA2, Document, Element;
var init_node = __esm({
  "node_modules/domhandler/dist/node.js"() {
    init_dist();
    Node = class {
      /** Parent of the node */
      parent = null;
      /** Previous sibling */
      prev = null;
      /** Next sibling */
      next = null;
      /** The start index of the node. Requires `withStartIndices` on the handler to be `true. */
      startIndex = null;
      /** The end index of the node. Requires `withEndIndices` on the handler to be `true. */
      endIndex = null;
      // Read-write aliases for properties
      /**
       * Same as {@link parent}.
       * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
       */
      get parentNode() {
        return this.parent;
      }
      set parentNode(parent) {
        this.parent = parent;
      }
      /**
       * Same as {@link prev}.
       * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
       */
      get previousSibling() {
        return this.prev;
      }
      set previousSibling(previous) {
        this.prev = previous;
      }
      /**
       * Same as {@link next}.
       * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
       */
      get nextSibling() {
        return this.next;
      }
      set nextSibling(next) {
        this.next = next;
      }
      /**
       * Clone this node, and optionally its children.
       * @param recursive Clone child nodes as well.
       * @returns A clone of the node.
       */
      cloneNode(recursive = false) {
        return cloneNode(this, recursive);
      }
    };
    DataNode = class extends Node {
      data;
      /**
       * @param data The content of the data node
       */
      constructor(data) {
        super();
        this.data = data;
      }
      /**
       * Same as {@link data}.
       * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
       */
      get nodeValue() {
        return this.data;
      }
      set nodeValue(data) {
        this.data = data;
      }
    };
    Text2 = class extends DataNode {
      type = ElementType.Text;
      get nodeType() {
        return 3;
      }
    };
    Comment2 = class extends DataNode {
      type = ElementType.Comment;
      get nodeType() {
        return 8;
      }
    };
    ProcessingInstruction = class extends DataNode {
      type = ElementType.Directive;
      name;
      constructor(name, data) {
        super(data);
        this.name = name;
      }
      get nodeType() {
        return 1;
      }
      /** If this is a doctype, the document type name (parse5 only). */
      "x-name";
      /** If this is a doctype, the document type public identifier (parse5 only). */
      "x-publicId";
      /** If this is a doctype, the document type system identifier (parse5 only). */
      "x-systemId";
    };
    NodeWithChildren = class extends Node {
      children;
      /**
       * @param children Children of the node. Only certain node types can have children.
       */
      constructor(children) {
        super();
        this.children = children;
      }
      // Aliases
      /** First child of the node. */
      get firstChild() {
        return this.children[0] ?? null;
      }
      /** Last child of the node. */
      get lastChild() {
        return this.children.length > 0 ? this.children[this.children.length - 1] : null;
      }
      /**
       * Same as {@link children}.
       * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
       */
      get childNodes() {
        return this.children;
      }
      set childNodes(children) {
        this.children = children;
      }
    };
    CDATA2 = class extends NodeWithChildren {
      type = ElementType.CDATA;
      get nodeType() {
        return 4;
      }
    };
    Document = class extends NodeWithChildren {
      type = ElementType.Root;
      get nodeType() {
        return 9;
      }
    };
    Element = class extends NodeWithChildren {
      name;
      attribs;
      type;
      /**
       * @param name Name of the tag, eg. `div`, `span`.
       * @param attribs Object mapping attribute names to attribute values.
       * @param children Children of the node.
       * @param type Node type used for the new node instance.
       */
      constructor(name, attribs, children = [], type = name === "script" ? ElementType.Script : name === "style" ? ElementType.Style : ElementType.Tag) {
        super(children);
        this.name = name;
        this.attribs = attribs;
        this.type = type;
      }
      get nodeType() {
        return 1;
      }
      // DOM Level 1 aliases
      /**
       * Same as {@link name}.
       * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
       */
      get tagName() {
        return this.name;
      }
      set tagName(name) {
        this.name = name;
      }
      get attributes() {
        return Object.keys(this.attribs).map((name) => ({
          name,
          value: this.attribs[name],
          namespace: this["x-attribsNamespace"]?.[name],
          prefix: this["x-attribsPrefix"]?.[name]
        }));
      }
      /** Element namespace (parse5 only). */
      namespace;
      /** Element attribute namespaces (parse5 only). */
      "x-attribsNamespace";
      /** Element attribute namespace-related prefixes (parse5 only). */
      "x-attribsPrefix";
    };
  }
});

// node_modules/domhandler/dist/index.js
var defaultOptions, DomHandler;
var init_dist2 = __esm({
  "node_modules/domhandler/dist/index.js"() {
    init_dist();
    init_node();
    init_node();
    defaultOptions = {
      withStartIndices: false,
      withEndIndices: false,
      xmlMode: false
    };
    DomHandler = class {
      /** The elements of the DOM */
      dom = [];
      /** The root element for the DOM */
      root = new Document(this.dom);
      /** Called once parsing has completed. */
      callback;
      /** Settings for the handler. */
      options;
      /** Callback whenever a tag is closed. */
      elementCB;
      /** Indicated whether parsing has been completed. */
      done = false;
      /** Stack of open tags. */
      tagStack = [this.root];
      /** A data node that is still being written to. */
      lastNode = null;
      /** Reference to the parser instance. Used for location information. */
      parser = null;
      /**
       * @param callback Called once parsing has completed.
       * @param options Settings for the handler.
       * @param elementCB Callback whenever a tag is closed.
       */
      constructor(callback, options, elementCB) {
        if (typeof options === "function") {
          elementCB = options;
          options = defaultOptions;
        }
        if (typeof callback === "object") {
          options = callback;
          callback = void 0;
        }
        this.callback = callback ?? null;
        this.options = options ?? defaultOptions;
        this.elementCB = elementCB ?? null;
      }
      onparserinit(parser) {
        this.parser = parser;
      }
      // Resets the handler back to starting state
      onreset() {
        this.dom = [];
        this.root = new Document(this.dom);
        this.done = false;
        this.tagStack = [this.root];
        this.lastNode = null;
        this.parser = null;
      }
      // Signals the handler that parsing is done
      onend() {
        if (this.done)
          return;
        this.done = true;
        this.parser = null;
        this.handleCallback(null);
      }
      onerror(error) {
        this.handleCallback(error);
      }
      onclosetag() {
        this.lastNode = null;
        const element = this.tagStack.pop();
        if (this.options.withEndIndices && this.parser) {
          element.endIndex = this.parser.endIndex;
        }
        if (this.elementCB)
          this.elementCB(element);
      }
      onopentag(name, attribs) {
        const type = this.options.xmlMode ? ElementType.Tag : void 0;
        const element = new Element(name, attribs, void 0, type);
        this.addNode(element);
        this.tagStack.push(element);
      }
      ontext(data) {
        const { lastNode } = this;
        if (lastNode && lastNode.type === ElementType.Text) {
          lastNode.data += data;
          if (this.options.withEndIndices && this.parser) {
            lastNode.endIndex = this.parser.endIndex;
          }
        } else {
          const node = new Text2(data);
          this.addNode(node);
          this.lastNode = node;
        }
      }
      oncomment(data) {
        if (this.lastNode && this.lastNode.type === ElementType.Comment) {
          this.lastNode.data += data;
          return;
        }
        const node = new Comment2(data);
        this.addNode(node);
        this.lastNode = node;
      }
      oncommentend() {
        this.lastNode = null;
      }
      oncdatastart() {
        const text = new Text2("");
        const node = new CDATA2([text]);
        this.addNode(node);
        text.parent = node;
        this.lastNode = text;
      }
      oncdataend() {
        this.lastNode = null;
      }
      onprocessinginstruction(name, data) {
        const node = new ProcessingInstruction(name, data);
        this.addNode(node);
      }
      handleCallback(error) {
        if (typeof this.callback === "function") {
          this.callback(error, this.dom);
        } else if (error) {
          throw error;
        }
      }
      addNode(node) {
        const parent = this.tagStack[this.tagStack.length - 1];
        const previousSibling = parent.children[parent.children.length - 1];
        if (this.options.withStartIndices && this.parser) {
          node.startIndex = this.parser.startIndex;
        }
        if (this.options.withEndIndices && this.parser) {
          node.endIndex = this.parser.endIndex;
        }
        parent.children.push(node);
        if (previousSibling) {
          node.prev = previousSibling;
          previousSibling.next = node;
        }
        node.parent = parent;
        this.lastNode = null;
      }
    };
  }
});

// node_modules/domutils/dist/querying.js
function filter(test, node, recurse = true, limit = Number.POSITIVE_INFINITY) {
  return find(test, Array.isArray(node) ? node : [node], recurse, limit);
}
function find(test, nodes, recurse, limit) {
  const result = [];
  const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
  const indexStack = [0];
  for (; ; ) {
    if (indexStack[0] >= nodeStack[0].length) {
      if (indexStack.length === 1) {
        return result;
      }
      nodeStack.shift();
      indexStack.shift();
      continue;
    }
    const element = nodeStack[0][indexStack[0]++];
    if (test(element)) {
      result.push(element);
      if (--limit <= 0)
        return result;
    }
    if (recurse && hasChildren(element) && element.children.length > 0) {
      indexStack.unshift(0);
      nodeStack.unshift(element.children);
    }
  }
}
function findOne(test, nodes, recurse = true) {
  const searchedNodes = Array.isArray(nodes) ? nodes : [nodes];
  for (const node of searchedNodes) {
    if (isTag2(node) && test(node)) {
      return node;
    }
    if (recurse && hasChildren(node) && node.children.length > 0) {
      const found = findOne(test, node.children, true);
      if (found)
        return found;
    }
  }
  return null;
}
function existsOne(test, nodes) {
  return (Array.isArray(nodes) ? nodes : [nodes]).some((node) => isTag2(node) && test(node) || hasChildren(node) && existsOne(test, node.children));
}
function findAll(test, nodes) {
  const result = [];
  const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
  const indexStack = [0];
  for (; ; ) {
    if (indexStack[0] >= nodeStack[0].length) {
      if (nodeStack.length === 1) {
        return result;
      }
      nodeStack.shift();
      indexStack.shift();
      continue;
    }
    const element = nodeStack[0][indexStack[0]++];
    if (isTag2(element) && test(element))
      result.push(element);
    if (hasChildren(element) && element.children.length > 0) {
      indexStack.unshift(0);
      nodeStack.unshift(element.children);
    }
  }
}
var init_querying = __esm({
  "node_modules/domutils/dist/querying.js"() {
    init_dist2();
  }
});

// node_modules/domutils/dist/legacy.js
function getAttribCheck(attrib, value) {
  if (typeof value === "function") {
    return (element) => isTag2(element) && value(element.attribs[attrib]);
  }
  return (element) => isTag2(element) && element.attribs[attrib] === value;
}
function combineFuncs(a, b) {
  return (element) => a(element) || b(element);
}
function compileTest(options) {
  const funcs = Object.keys(options).map((key) => {
    const value = options[key];
    return Object.hasOwn(Checks, key) ? Checks[key](value) : getAttribCheck(key, value);
  });
  return funcs.length === 0 ? null : funcs.reduce(combineFuncs);
}
function testElement(options, node) {
  const test = compileTest(options);
  return test ? test(node) : true;
}
function getElements(options, nodes, recurse, limit = Number.POSITIVE_INFINITY) {
  const test = compileTest(options);
  return test ? filter(test, nodes, recurse, limit) : [];
}
function getElementById(id, nodes, recurse = true) {
  if (!Array.isArray(nodes))
    nodes = [nodes];
  return findOne(getAttribCheck("id", id), nodes, recurse);
}
function getElementsByTagName(tagName, nodes, recurse = true, limit = Number.POSITIVE_INFINITY) {
  return filter(Checks["tag_name"](tagName), nodes, recurse, limit);
}
function getElementsByClassName(className, nodes, recurse = true, limit = Number.POSITIVE_INFINITY) {
  return filter(getAttribCheck("class", className), nodes, recurse, limit);
}
function getElementsByTagType(type, nodes, recurse = true, limit = Number.POSITIVE_INFINITY) {
  return filter(Checks["tag_type"](type), nodes, recurse, limit);
}
var Checks;
var init_legacy = __esm({
  "node_modules/domutils/dist/legacy.js"() {
    init_dist2();
    init_querying();
    Checks = {
      tag_name(name) {
        if (typeof name === "function") {
          return (element) => isTag2(element) && name(element.name);
        }
        if (name === "*") {
          return isTag2;
        }
        return (element) => isTag2(element) && element.name === name;
      },
      tag_type(type) {
        if (typeof type === "function") {
          return (element) => type(element.type);
        }
        return (element) => element.type === type;
      },
      tag_contains(data) {
        if (typeof data === "function") {
          return (element) => isText(element) && data(element.data);
        }
        return (element) => isText(element) && element.data === data;
      }
    };
  }
});

// node_modules/entities/dist/escape.js
function getEscape(char) {
  return char === 34 ? "&quot;" : char === 38 ? "&amp;" : char === 39 ? "&apos;" : char === 60 ? "&lt;" : char === 62 ? "&gt;" : "&nbsp;";
}
function isXmlEscapable(code) {
  return code >= 128 || code >= 32 && code < 64 && (XML_BITSET_VALUE >>> code & 1) === 1;
}
function encodeXML(input) {
  const { length } = input;
  let out;
  let last = 0;
  let index = 0;
  while (index < length) {
    const char = input.charCodeAt(index);
    if (!isXmlEscapable(char)) {
      const bound = Math.min(index + 32, length);
      let next = index + 1;
      while (next < bound && !isXmlEscapable(input.charCodeAt(next))) {
        next++;
      }
      if (next < bound) {
        index = next;
        continue;
      }
      if (next >= length)
        break;
      xmlEncodeRegex.lastIndex = next;
      if (!xmlEncodeRegex.test(input))
        break;
      index = xmlEncodeRegex.lastIndex - 1;
      continue;
    }
    if (out === void 0)
      out = input.substring(0, index);
    else if (last !== index)
      out += input.substring(last, index);
    if (char < 64) {
      out += getEscape(char);
      last = index += 1;
      continue;
    }
    const cp = input.codePointAt(index);
    out += `&#x${cp.toString(16)};`;
    if (cp !== char)
      index++;
    last = index += 1;
  }
  if (out === void 0)
    return input;
  if (last < length)
    out += input.substr(last);
  return out;
}
function escapeWithRegex(re, data) {
  re.lastIndex = 0;
  if (!re.test(data))
    return data;
  let out = "";
  let last = 0;
  do {
    const index = re.lastIndex - 1;
    if (last !== index)
      out += data.substring(last, index);
    const char = data.charCodeAt(index);
    out += getEscape(char);
    last = index + 1;
  } while (re.test(data));
  return out + data.substring(last);
}
function escapeAttribute(data) {
  return escapeWithRegex(attributeEscapeRegex, data);
}
function escapeText(data) {
  return escapeWithRegex(textEscapeRegex, data);
}
var XML_BITSET_VALUE, xmlEncodeRegex, attributeEscapeRegex, textEscapeRegex;
var init_escape = __esm({
  "node_modules/entities/dist/escape.js"() {
    XML_BITSET_VALUE = 1342177476;
    xmlEncodeRegex = /["&'<>\u0080-\uFFFF]/g;
    attributeEscapeRegex = /["&\u{A0}]/gu;
    textEscapeRegex = /[&<>\u{A0}]/gu;
  }
});

// node_modules/entities/dist/index.js
var EntityLevel, EncodingMode;
var init_dist3 = __esm({
  "node_modules/entities/dist/index.js"() {
    init_escape();
    (function(EntityLevel2) {
      EntityLevel2[EntityLevel2["XML"] = 0] = "XML";
      EntityLevel2[EntityLevel2["HTML"] = 1] = "HTML";
    })(EntityLevel || (EntityLevel = {}));
    (function(EncodingMode2) {
      EncodingMode2[EncodingMode2["UTF8"] = 0] = "UTF8";
      EncodingMode2[EncodingMode2["ASCII"] = 1] = "ASCII";
      EncodingMode2[EncodingMode2["Extensive"] = 2] = "Extensive";
      EncodingMode2[EncodingMode2["Attribute"] = 3] = "Attribute";
      EncodingMode2[EncodingMode2["Text"] = 4] = "Text";
    })(EncodingMode || (EncodingMode = {}));
  }
});

// node_modules/dom-serializer/dist/foreign-names.js
var elementNames, attributeNames;
var init_foreign_names = __esm({
  "node_modules/dom-serializer/dist/foreign-names.js"() {
    elementNames = new Map("altGlyph altGlyphDef altGlyphItem animateColor animateMotion animateTransform clipPath feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence foreignObject glyphRef linearGradient radialGradient textPath".split(" ").map((name) => [name.toLowerCase(), name]));
    attributeNames = new Map("definitionURL attributeName attributeType baseFrequency baseProfile calcMode clipPathUnits diffuseConstant edgeMode filterUnits glyphRef gradientTransform gradientUnits kernelMatrix kernelUnitLength keyPoints keySplines keyTimes lengthAdjust limitingConeAngle markerHeight markerUnits markerWidth maskContentUnits maskUnits numOctaves pathLength patternContentUnits patternTransform patternUnits pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits refX refY repeatCount repeatDur requiredExtensions requiredFeatures specularConstant specularExponent spreadMethod startOffset stdDeviation stitchTiles surfaceScale systemLanguage tableValues targetX targetY textLength viewBox viewTarget xChannelSelector yChannelSelector zoomAndPan".split(" ").map((name) => [name.toLowerCase(), name]));
  }
});

// node_modules/dom-serializer/dist/index.js
function render(node, options = {}) {
  const nodes = "length" in node ? node : [node];
  const xmlMode = options.xmlMode ?? false;
  let output = "";
  for (let index = 0; index < nodes.length; index++) {
    output += renderNode(nodes[index], options, xmlMode);
  }
  return output;
}
function renderChildren(children, options, xmlMode) {
  let output = "";
  for (let index = 0; index < children.length; index++) {
    output += renderNode(children[index], options, xmlMode);
  }
  return output;
}
function renderNode(node, options, xmlMode) {
  switch (node.type) {
    case Root: {
      return renderChildren(node.children, options, xmlMode);
    }
    case Directive: {
      return `<${node.data}>`;
    }
    case Comment: {
      return `<!--${node.data}-->`;
    }
    case CDATA: {
      return `<![CDATA[${node.children[0].data}]]>`;
    }
    case Script:
    case Style:
    case Tag: {
      return renderTag(node, options, xmlMode);
    }
    case Text: {
      const element = node;
      const data = element.data || "";
      if ((options.encodeEntities ?? options.decodeEntities) !== false && !(!xmlMode && element.parent && unencodedElements.has(element.parent.name))) {
        return xmlMode || options.encodeEntities !== "utf8" ? encodeXML(data) : escapeText(data);
      }
      return data;
    }
  }
}
function renderTag(element, options, xmlMode) {
  if (xmlMode === "foreign") {
    element.name = elementNames.get(element.name) ?? element.name;
    if (element.parent && foreignModeIntegrationPoints.has(element.parent.name)) {
      xmlMode = false;
    }
  }
  if (!xmlMode && foreignElements.has(element.name)) {
    xmlMode = "foreign";
  }
  const { name, children } = element;
  const isVoid = !xmlMode && voidElements2.has(name);
  let tag = `<${name}${formatAttributes(element.attribs, options, xmlMode)}`;
  if (children.length === 0 && (xmlMode ? options.selfClosingTags !== false : options.selfClosingTags && isVoid)) {
    tag += xmlMode ? "/>" : " />";
  } else {
    tag += ">";
    if (children.length > 0) {
      tag += renderChildren(children, options, xmlMode);
    }
    if (!isVoid) {
      tag += `</${name}>`;
    }
  }
  return tag;
}
function replaceQuotes(value) {
  return value.replaceAll('"', "&quot;");
}
function formatAttributes(attributes, options, xmlMode) {
  if (!attributes)
    return "";
  const encode = (options.encodeEntities ?? options.decodeEntities) === false ? replaceQuotes : xmlMode || options.encodeEntities !== "utf8" ? encodeXML : escapeAttribute;
  const isForeign = xmlMode === "foreign";
  const showEmpty = !!(options.emptyAttrs ?? xmlMode);
  let result = "";
  for (const key in attributes) {
    if (!Object.hasOwn(attributes, key))
      continue;
    const value = attributes[key];
    const k = isForeign ? attributeNames.get(key) ?? key : key;
    result += !showEmpty && (value == null || value === "") ? ` ${k}` : ` ${k}="${encode(value == null ? "" : String(value))}"`;
  }
  return result;
}
var unencodedElements, voidElements2, foreignElements, foreignModeIntegrationPoints, dist_default;
var init_dist4 = __esm({
  "node_modules/dom-serializer/dist/index.js"() {
    init_dist();
    init_dist3();
    init_foreign_names();
    unencodedElements = new Set("style script xmp iframe noembed noframes plaintext noscript".split(" "));
    voidElements2 = new Set("area base basefont br col command embed frame hr img input isindex keygen link meta param source track wbr".split(" "));
    foreignElements = /* @__PURE__ */ new Set(["svg", "math"]);
    foreignModeIntegrationPoints = new Set("mi mo mn ms mtext annotation-xml foreignObject desc title".split(" "));
    dist_default = render;
  }
});

// node_modules/domutils/dist/stringify.js
function getOuterHTML(node, options) {
  return dist_default(node, options);
}
function getInnerHTML(node, options) {
  return hasChildren(node) ? node.children.map((node2) => getOuterHTML(node2, options)).join("") : "";
}
function getText(node) {
  if (Array.isArray(node))
    return node.map(getText).join("");
  if (isTag2(node))
    return node.name === "br" ? "\n" : getText(node.children);
  if (isCDATA(node))
    return getText(node.children);
  if (isText(node))
    return node.data;
  return "";
}
function textContent(node) {
  if (Array.isArray(node))
    return node.map(textContent).join("");
  if (hasChildren(node) && !isComment(node)) {
    return textContent(node.children);
  }
  if (isText(node))
    return node.data;
  return "";
}
function innerText(node) {
  if (Array.isArray(node))
    return node.map(innerText).join("");
  if (hasChildren(node) && (node.type === ElementType.Tag || isCDATA(node))) {
    return innerText(node.children);
  }
  if (isText(node))
    return node.data;
  return "";
}
var init_stringify = __esm({
  "node_modules/domutils/dist/stringify.js"() {
    init_dist4();
    init_dist();
    init_dist2();
  }
});

// node_modules/domutils/dist/feeds.js
function getFeed(document) {
  const feedRoot = getOneElement(isValidFeed, document);
  return feedRoot ? feedRoot.name === "feed" ? getAtomFeed(feedRoot) : getRssFeed(feedRoot) : null;
}
function getAtomFeed(feedRoot) {
  const childs = feedRoot.children;
  const feed = {
    type: "atom",
    items: getElementsByTagName("entry", childs).map((item) => {
      const { children } = item;
      const entry = { media: getMediaElements(children) };
      addConditionally(entry, "id", "id", children);
      addConditionally(entry, "title", "title", children);
      const href2 = getOneElement("link", children)?.attribs["href"];
      if (href2) {
        entry.link = href2;
      }
      const description = fetch2("summary", children) || fetch2("content", children);
      if (description) {
        entry.description = description;
      }
      const pubDate = fetch2("updated", children);
      if (pubDate) {
        entry.pubDate = new Date(pubDate);
      }
      return entry;
    })
  };
  addConditionally(feed, "id", "id", childs);
  addConditionally(feed, "title", "title", childs);
  const href = getOneElement("link", childs)?.attribs["href"];
  if (href) {
    feed.link = href;
  }
  addConditionally(feed, "description", "subtitle", childs);
  const updated = fetch2("updated", childs);
  if (updated) {
    feed.updated = new Date(updated);
  }
  addConditionally(feed, "author", "email", childs, true);
  return feed;
}
function getRssFeed(feedRoot) {
  const childs = getOneElement("channel", feedRoot.children)?.children ?? [];
  const feed = {
    type: feedRoot.name.substr(0, 3),
    id: "",
    items: getElementsByTagName("item", feedRoot.children).map((item) => {
      const { children } = item;
      const entry = { media: getMediaElements(children) };
      addConditionally(entry, "id", "guid", children);
      addConditionally(entry, "title", "title", children);
      addConditionally(entry, "link", "link", children);
      addConditionally(entry, "description", "description", children);
      const pubDate = fetch2("pubDate", children) || fetch2("dc:date", children);
      if (pubDate)
        entry.pubDate = new Date(pubDate);
      return entry;
    })
  };
  addConditionally(feed, "title", "title", childs);
  addConditionally(feed, "link", "link", childs);
  addConditionally(feed, "description", "description", childs);
  const updated = fetch2("lastBuildDate", childs);
  if (updated) {
    feed.updated = new Date(updated);
  }
  addConditionally(feed, "author", "managingEditor", childs, true);
  return feed;
}
function getMediaElements(where) {
  return getElementsByTagName("media:content", where).map((element) => {
    const { attribs } = element;
    const media = {
      medium: attribs["medium"],
      isDefault: !!attribs["isDefault"]
    };
    for (const attrib of MEDIA_KEYS_STRING) {
      if (attribs[attrib]) {
        media[attrib] = attribs[attrib];
      }
    }
    for (const attrib of MEDIA_KEYS_INT) {
      if (attribs[attrib]) {
        media[attrib] = Number.parseInt(attribs[attrib], 10);
      }
    }
    if (attribs["expression"]) {
      media.expression = attribs["expression"];
    }
    return media;
  });
}
function getOneElement(tagName, node) {
  return getElementsByTagName(tagName, node, true, 1)[0];
}
function fetch2(tagName, where, recurse = false) {
  return textContent(getElementsByTagName(tagName, where, recurse, 1)).trim();
}
function addConditionally(object, property, tagName, where, recurse = false) {
  const value = fetch2(tagName, where, recurse);
  if (value)
    object[property] = value;
}
function isValidFeed(value) {
  return value === "rss" || value === "feed" || value === "rdf:RDF";
}
var MEDIA_KEYS_STRING, MEDIA_KEYS_INT;
var init_feeds = __esm({
  "node_modules/domutils/dist/feeds.js"() {
    init_legacy();
    init_stringify();
    MEDIA_KEYS_STRING = ["url", "type", "lang"];
    MEDIA_KEYS_INT = [
      "fileSize",
      "bitrate",
      "framerate",
      "samplingrate",
      "channels",
      "duration",
      "height",
      "width"
    ];
  }
});

// node_modules/domutils/dist/helpers.js
function removeSubsets(nodes) {
  let index = nodes.length;
  while (--index >= 0) {
    const node = nodes[index];
    if (index > 0 && nodes.lastIndexOf(node, index - 1) >= 0) {
      nodes.splice(index, 1);
      continue;
    }
    for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
      if (nodes.includes(ancestor)) {
        nodes.splice(index, 1);
        break;
      }
    }
  }
  return nodes;
}
function compareDocumentPosition(nodeA, nodeB) {
  const aParents = [];
  const bParents = [];
  if (nodeA === nodeB) {
    return 0;
  }
  let current = hasChildren(nodeA) ? nodeA : nodeA.parent;
  while (current) {
    aParents.unshift(current);
    current = current.parent;
  }
  current = hasChildren(nodeB) ? nodeB : nodeB.parent;
  while (current) {
    bParents.unshift(current);
    current = current.parent;
  }
  const maxIndex = Math.min(aParents.length, bParents.length);
  let index = 0;
  while (index < maxIndex && aParents[index] === bParents[index]) {
    index++;
  }
  if (index === 0) {
    return DocumentPosition.DISCONNECTED;
  }
  const sharedParent = aParents[index - 1];
  const siblings = sharedParent.children;
  const aSibling = aParents[index];
  const bSibling = bParents[index];
  if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
    if (sharedParent === nodeB) {
      return DocumentPosition.FOLLOWING | DocumentPosition.CONTAINED_BY;
    }
    return DocumentPosition.FOLLOWING;
  }
  if (sharedParent === nodeA) {
    return DocumentPosition.PRECEDING | DocumentPosition.CONTAINS;
  }
  return DocumentPosition.PRECEDING;
}
function uniqueSort(nodes) {
  nodes = nodes.filter((node, index, array) => !array.includes(node, index + 1));
  nodes.sort((a, b) => {
    const relative = compareDocumentPosition(a, b);
    if (relative & DocumentPosition.PRECEDING) {
      return -1;
    }
    if (relative & DocumentPosition.FOLLOWING) {
      return 1;
    }
    return 0;
  });
  return nodes;
}
var DocumentPosition;
var init_helpers = __esm({
  "node_modules/domutils/dist/helpers.js"() {
    init_dist2();
    (function(DocumentPosition2) {
      DocumentPosition2[DocumentPosition2["DISCONNECTED"] = 1] = "DISCONNECTED";
      DocumentPosition2[DocumentPosition2["PRECEDING"] = 2] = "PRECEDING";
      DocumentPosition2[DocumentPosition2["FOLLOWING"] = 4] = "FOLLOWING";
      DocumentPosition2[DocumentPosition2["CONTAINS"] = 8] = "CONTAINS";
      DocumentPosition2[DocumentPosition2["CONTAINED_BY"] = 16] = "CONTAINED_BY";
    })(DocumentPosition || (DocumentPosition = {}));
  }
});

// node_modules/domutils/dist/manipulation.js
function removeElement(element) {
  if (element.prev)
    element.prev.next = element.next;
  if (element.next)
    element.next.prev = element.prev;
  if (element.parent) {
    const childs = element.parent.children;
    const childsIndex = childs.lastIndexOf(element);
    if (childsIndex !== -1) {
      childs.splice(childsIndex, 1);
    }
  }
  element.next = null;
  element.prev = null;
  element.parent = null;
}
function replaceElement(element, replacement) {
  replacement.prev = element.prev;
  if (replacement.prev) {
    replacement.prev.next = replacement;
  }
  replacement.next = element.next;
  if (replacement.next) {
    replacement.next.prev = replacement;
  }
  replacement.parent = element.parent;
  if (replacement.parent) {
    const { children } = replacement.parent;
    const elementIndex = children.lastIndexOf(element);
    if (elementIndex === -1) {
      return;
    }
    children[elementIndex] = replacement;
    element.parent = null;
  }
}
function appendChild(parent, child) {
  removeElement(child);
  child.next = null;
  child.parent = parent;
  if (parent.children.push(child) > 1) {
    const sibling = parent.children[parent.children.length - 2];
    sibling.next = child;
    child.prev = sibling;
  } else {
    child.prev = null;
  }
}
function append(element, next) {
  removeElement(next);
  const { parent } = element;
  const currentNext = element.next;
  next.next = currentNext;
  next.prev = element;
  element.next = next;
  next.parent = parent;
  if (currentNext) {
    currentNext.prev = next;
    if (parent) {
      const childs = parent.children;
      childs.splice(childs.lastIndexOf(currentNext), 0, next);
    }
  } else if (parent) {
    parent.children.push(next);
  }
}
function prependChild(parent, child) {
  removeElement(child);
  child.parent = parent;
  child.prev = null;
  if (parent.children.unshift(child) === 1) {
    child.next = null;
  } else {
    const sibling = parent.children[1];
    sibling.prev = child;
    child.next = sibling;
  }
}
function prepend(element, previous) {
  removeElement(previous);
  const { parent } = element;
  if (parent) {
    const childs = parent.children;
    childs.splice(childs.indexOf(element), 0, previous);
  }
  if (element.prev) {
    element.prev.next = previous;
  }
  previous.parent = parent;
  previous.prev = element.prev;
  previous.next = element;
  element.prev = previous;
}
var init_manipulation = __esm({
  "node_modules/domutils/dist/manipulation.js"() {
  }
});

// node_modules/domutils/dist/traversal.js
function getChildren(element) {
  return hasChildren(element) ? element.children : [];
}
function getParent(element) {
  return element.parent || null;
}
function getSiblings(element) {
  const parent = getParent(element);
  if (parent != null)
    return getChildren(parent);
  const siblings = [element];
  let { prev, next } = element;
  while (prev != null) {
    siblings.unshift(prev);
    ({ prev } = prev);
  }
  while (next != null) {
    siblings.push(next);
    ({ next } = next);
  }
  return siblings;
}
function getAttributeValue(element, name) {
  const { attribs } = element;
  return attribs?.[name];
}
function hasAttrib(element, name) {
  const { attribs } = element;
  return attribs != null && Object.hasOwn(attribs, name) && attribs[name] != null;
}
function getName(element) {
  return element.name;
}
function nextElementSibling(element) {
  let { next } = element;
  while (next !== null && !isTag2(next))
    ({ next } = next);
  return next;
}
function prevElementSibling(element) {
  let { prev } = element;
  while (prev !== null && !isTag2(prev))
    ({ prev } = prev);
  return prev;
}
var init_traversal = __esm({
  "node_modules/domutils/dist/traversal.js"() {
    init_dist2();
  }
});

// node_modules/domutils/dist/index.js
var dist_exports2 = {};
__export(dist_exports2, {
  DocumentPosition: () => DocumentPosition,
  append: () => append,
  appendChild: () => appendChild,
  compareDocumentPosition: () => compareDocumentPosition,
  existsOne: () => existsOne,
  filter: () => filter,
  find: () => find,
  findAll: () => findAll,
  findOne: () => findOne,
  getAttributeValue: () => getAttributeValue,
  getChildren: () => getChildren,
  getElementById: () => getElementById,
  getElements: () => getElements,
  getElementsByClassName: () => getElementsByClassName,
  getElementsByTagName: () => getElementsByTagName,
  getElementsByTagType: () => getElementsByTagType,
  getFeed: () => getFeed,
  getInnerHTML: () => getInnerHTML,
  getName: () => getName,
  getOuterHTML: () => getOuterHTML,
  getParent: () => getParent,
  getSiblings: () => getSiblings,
  getText: () => getText,
  hasAttrib: () => hasAttrib,
  innerText: () => innerText,
  nextElementSibling: () => nextElementSibling,
  prepend: () => prepend,
  prependChild: () => prependChild,
  prevElementSibling: () => prevElementSibling,
  removeElement: () => removeElement,
  removeSubsets: () => removeSubsets,
  replaceElement: () => replaceElement,
  testElement: () => testElement,
  textContent: () => textContent,
  uniqueSort: () => uniqueSort
});
var init_dist5 = __esm({
  "node_modules/domutils/dist/index.js"() {
    init_feeds();
    init_helpers();
    init_legacy();
    init_manipulation();
    init_querying();
    init_stringify();
    init_traversal();
  }
});

// node_modules/htmlparser2/dist/index.js
var dist_exports3 = {};
__export(dist_exports3, {
  DefaultHandler: () => DomHandler,
  DomHandler: () => DomHandler,
  DomUtils: () => dist_exports2,
  ElementType: () => dist_exports,
  Parser: () => Parser,
  QuoteType: () => QuoteType,
  Tokenizer: () => Tokenizer,
  createDocumentStream: () => createDocumentStream,
  getFeed: () => getFeed,
  parseDocument: () => parseDocument,
  parseFeed: () => parseFeed
});
function parseDocument(data, options) {
  const handler = new DomHandler(void 0, options);
  new Parser(handler, options).end(data);
  return handler.root;
}
function createDocumentStream(callback, options, elementCallback) {
  const handler = new DomHandler((error) => callback(error, handler.root), options, elementCallback);
  return new Parser(handler, options);
}
function parseFeed(feed, options = parseFeedDefaultOptions) {
  return getFeed(parseDocument(feed, options).children);
}
var parseFeedDefaultOptions;
var init_dist6 = __esm({
  "node_modules/htmlparser2/dist/index.js"() {
    init_Parser();
    init_Parser();
    init_dist2();
    init_dist2();
    init_dist();
    init_Tokenizer();
    init_dist5();
    init_dist5();
    init_dist5();
    parseFeedDefaultOptions = { xmlMode: true };
  }
});

// node_modules/escape-string-regexp/index.js
var require_escape_string_regexp = __commonJS({
  "node_modules/escape-string-regexp/index.js"(exports, module) {
    "use strict";
    module.exports = (string) => {
      if (typeof string !== "string") {
        throw new TypeError("Expected a string");
      }
      return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
    };
  }
});

// node_modules/sanitize-html/node_modules/is-plain-object/dist/is-plain-object.js
var require_is_plain_object = __commonJS({
  "node_modules/sanitize-html/node_modules/is-plain-object/dist/is-plain-object.js"(exports) {
    "use strict";
    function isObject(o) {
      return Object.prototype.toString.call(o) === "[object Object]";
    }
    function isPlainObject(o) {
      var ctor, prot;
      if (isObject(o) === false) return false;
      ctor = o.constructor;
      if (ctor === void 0) return true;
      prot = ctor.prototype;
      if (isObject(prot) === false) return false;
      if (prot.hasOwnProperty("isPrototypeOf") === false) {
        return false;
      }
      return true;
    }
    exports.isPlainObject = isPlainObject;
  }
});

// node_modules/parse-srcset/src/parse-srcset.js
var require_parse_srcset = __commonJS({
  "node_modules/parse-srcset/src/parse-srcset.js"(exports, module) {
    (function(root, factory) {
      if (typeof define === "function" && define.amd) {
        define([], factory);
      } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
      } else {
        root.parseSrcset = factory();
      }
    })(exports, function() {
      return function(input) {
        function isSpace(c2) {
          return c2 === " " || // space
          c2 === "	" || // horizontal tab
          c2 === "\n" || // new line
          c2 === "\f" || // form feed
          c2 === "\r";
        }
        function collectCharacters(regEx) {
          var chars, match = regEx.exec(input.substring(pos));
          if (match) {
            chars = match[0];
            pos += chars.length;
            return chars;
          }
        }
        var inputLength = input.length, regexLeadingSpaces = /^[ \t\n\r\u000c]+/, regexLeadingCommasOrSpaces = /^[, \t\n\r\u000c]+/, regexLeadingNotSpaces = /^[^ \t\n\r\u000c]+/, regexTrailingCommas = /[,]+$/, regexNonNegativeInteger = /^\d+$/, regexFloatingPoint = /^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/, url, descriptors, currentDescriptor, state, c, pos = 0, candidates = [];
        while (true) {
          collectCharacters(regexLeadingCommasOrSpaces);
          if (pos >= inputLength) {
            return candidates;
          }
          url = collectCharacters(regexLeadingNotSpaces);
          descriptors = [];
          if (url.slice(-1) === ",") {
            url = url.replace(regexTrailingCommas, "");
            parseDescriptors();
          } else {
            tokenize();
          }
        }
        function tokenize() {
          collectCharacters(regexLeadingSpaces);
          currentDescriptor = "";
          state = "in descriptor";
          while (true) {
            c = input.charAt(pos);
            if (state === "in descriptor") {
              if (isSpace(c)) {
                if (currentDescriptor) {
                  descriptors.push(currentDescriptor);
                  currentDescriptor = "";
                  state = "after descriptor";
                }
              } else if (c === ",") {
                pos += 1;
                if (currentDescriptor) {
                  descriptors.push(currentDescriptor);
                }
                parseDescriptors();
                return;
              } else if (c === "(") {
                currentDescriptor = currentDescriptor + c;
                state = "in parens";
              } else if (c === "") {
                if (currentDescriptor) {
                  descriptors.push(currentDescriptor);
                }
                parseDescriptors();
                return;
              } else {
                currentDescriptor = currentDescriptor + c;
              }
            } else if (state === "in parens") {
              if (c === ")") {
                currentDescriptor = currentDescriptor + c;
                state = "in descriptor";
              } else if (c === "") {
                descriptors.push(currentDescriptor);
                parseDescriptors();
                return;
              } else {
                currentDescriptor = currentDescriptor + c;
              }
            } else if (state === "after descriptor") {
              if (isSpace(c)) {
              } else if (c === "") {
                parseDescriptors();
                return;
              } else {
                state = "in descriptor";
                pos -= 1;
              }
            }
            pos += 1;
          }
        }
        function parseDescriptors() {
          var pError = false, w, d, h, i, candidate = {}, desc, lastChar, value, intVal, floatVal;
          for (i = 0; i < descriptors.length; i++) {
            desc = descriptors[i];
            lastChar = desc[desc.length - 1];
            value = desc.substring(0, desc.length - 1);
            intVal = parseInt(value, 10);
            floatVal = parseFloat(value);
            if (regexNonNegativeInteger.test(value) && lastChar === "w") {
              if (w || d) {
                pError = true;
              }
              if (intVal === 0) {
                pError = true;
              } else {
                w = intVal;
              }
            } else if (regexFloatingPoint.test(value) && lastChar === "x") {
              if (w || d || h) {
                pError = true;
              }
              if (floatVal < 0) {
                pError = true;
              } else {
                d = floatVal;
              }
            } else if (regexNonNegativeInteger.test(value) && lastChar === "h") {
              if (h || d) {
                pError = true;
              }
              if (intVal === 0) {
                pError = true;
              } else {
                h = intVal;
              }
            } else {
              pError = true;
            }
          }
          if (!pError) {
            candidate.url = url;
            if (w) {
              candidate.w = w;
            }
            if (d) {
              candidate.d = d;
            }
            if (h) {
              candidate.h = h;
            }
            candidates.push(candidate);
          } else if (console && console.log) {
            console.log("Invalid srcset descriptor found in '" + input + "' at '" + desc + "'.");
          }
        }
      };
    });
  }
});

// node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS({
  "node_modules/picocolors/picocolors.js"(exports, module) {
    var p = process || {};
    var argv = p.argv || [];
    var env = p.env || {};
    var isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env.TERM !== "dumb" || !!env.CI);
    var formatter = (open, close, replace = open) => (input) => {
      let string = "" + input, index = string.indexOf(close, open.length);
      return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    };
    var replaceClose = (string, close, replace, index) => {
      let result = "", cursor = 0;
      do {
        result += string.substring(cursor, index) + replace;
        cursor = index + close.length;
        index = string.indexOf(close, cursor);
      } while (~index);
      return result + string.substring(cursor);
    };
    var createColors = (enabled = isColorSupported) => {
      let f = enabled ? formatter : () => String;
      return {
        isColorSupported: enabled,
        reset: f("\x1B[0m", "\x1B[0m"),
        bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
        dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
        italic: f("\x1B[3m", "\x1B[23m"),
        underline: f("\x1B[4m", "\x1B[24m"),
        inverse: f("\x1B[7m", "\x1B[27m"),
        hidden: f("\x1B[8m", "\x1B[28m"),
        strikethrough: f("\x1B[9m", "\x1B[29m"),
        black: f("\x1B[30m", "\x1B[39m"),
        red: f("\x1B[31m", "\x1B[39m"),
        green: f("\x1B[32m", "\x1B[39m"),
        yellow: f("\x1B[33m", "\x1B[39m"),
        blue: f("\x1B[34m", "\x1B[39m"),
        magenta: f("\x1B[35m", "\x1B[39m"),
        cyan: f("\x1B[36m", "\x1B[39m"),
        white: f("\x1B[37m", "\x1B[39m"),
        gray: f("\x1B[90m", "\x1B[39m"),
        bgBlack: f("\x1B[40m", "\x1B[49m"),
        bgRed: f("\x1B[41m", "\x1B[49m"),
        bgGreen: f("\x1B[42m", "\x1B[49m"),
        bgYellow: f("\x1B[43m", "\x1B[49m"),
        bgBlue: f("\x1B[44m", "\x1B[49m"),
        bgMagenta: f("\x1B[45m", "\x1B[49m"),
        bgCyan: f("\x1B[46m", "\x1B[49m"),
        bgWhite: f("\x1B[47m", "\x1B[49m"),
        blackBright: f("\x1B[90m", "\x1B[39m"),
        redBright: f("\x1B[91m", "\x1B[39m"),
        greenBright: f("\x1B[92m", "\x1B[39m"),
        yellowBright: f("\x1B[93m", "\x1B[39m"),
        blueBright: f("\x1B[94m", "\x1B[39m"),
        magentaBright: f("\x1B[95m", "\x1B[39m"),
        cyanBright: f("\x1B[96m", "\x1B[39m"),
        whiteBright: f("\x1B[97m", "\x1B[39m"),
        bgBlackBright: f("\x1B[100m", "\x1B[49m"),
        bgRedBright: f("\x1B[101m", "\x1B[49m"),
        bgGreenBright: f("\x1B[102m", "\x1B[49m"),
        bgYellowBright: f("\x1B[103m", "\x1B[49m"),
        bgBlueBright: f("\x1B[104m", "\x1B[49m"),
        bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
        bgCyanBright: f("\x1B[106m", "\x1B[49m"),
        bgWhiteBright: f("\x1B[107m", "\x1B[49m")
      };
    };
    module.exports = createColors();
    module.exports.createColors = createColors;
  }
});

// node_modules/postcss/lib/tokenize.js
var require_tokenize = __commonJS({
  "node_modules/postcss/lib/tokenize.js"(exports, module) {
    "use strict";
    var SINGLE_QUOTE = "'".charCodeAt(0);
    var DOUBLE_QUOTE = '"'.charCodeAt(0);
    var BACKSLASH = "\\".charCodeAt(0);
    var SLASH = "/".charCodeAt(0);
    var NEWLINE = "\n".charCodeAt(0);
    var SPACE = " ".charCodeAt(0);
    var FEED = "\f".charCodeAt(0);
    var TAB = "	".charCodeAt(0);
    var CR = "\r".charCodeAt(0);
    var OPEN_SQUARE = "[".charCodeAt(0);
    var CLOSE_SQUARE = "]".charCodeAt(0);
    var OPEN_PARENTHESES = "(".charCodeAt(0);
    var CLOSE_PARENTHESES = ")".charCodeAt(0);
    var OPEN_CURLY = "{".charCodeAt(0);
    var CLOSE_CURLY = "}".charCodeAt(0);
    var SEMICOLON = ";".charCodeAt(0);
    var ASTERISK = "*".charCodeAt(0);
    var COLON = ":".charCodeAt(0);
    var AT = "@".charCodeAt(0);
    var RE_AT_END = /[\t\n\f\r "#'()/;[\\\]{}]/g;
    var RE_WORD_END = /[\t\n\f\r !"#'():;@[\\\]{}]|\/(?=\*)/g;
    var RE_BAD_BRACKET = /.[\r\n"'(/\\]/;
    var RE_HEX_ESCAPE = /[\da-f]/i;
    var RE_URL_NAME = /(^|[\t\n\f\r "'(),/:;[\]{}])url$/i;
    var RE_QUOTED = /[\t\n\f\r ]*["']/y;
    module.exports = function tokenizer(input, options = {}) {
      let css = input.css.valueOf();
      let ignore = options.ignoreErrors;
      let code, content, escape2, next, quote;
      let currentToken, escaped, escapePos;
      let length = css.length;
      let pos = 0;
      let returned = [];
      let lastBadParen = -1;
      function position() {
        return pos;
      }
      function unclosed(what) {
        throw input.error("Unclosed " + what, pos);
      }
      function endOfFile() {
        return returned.length === 0 && pos >= length;
      }
      function nextToken(opts) {
        if (returned.length) return returned.pop();
        if (pos >= length) return;
        let ignoreUnclosed = opts ? opts.ignoreUnclosed : false;
        code = css.charCodeAt(pos);
        switch (code) {
          case NEWLINE:
          case SPACE:
          case TAB:
          case CR:
          case FEED: {
            next = pos;
            do {
              next += 1;
              code = css.charCodeAt(next);
            } while (code === SPACE || code === NEWLINE || code === TAB || code === CR || code === FEED);
            currentToken = ["space", css.slice(pos, next)];
            pos = next - 1;
            break;
          }
          case OPEN_SQUARE:
          case CLOSE_SQUARE:
          case OPEN_CURLY:
          case CLOSE_CURLY:
          case COLON:
          case SEMICOLON:
          case CLOSE_PARENTHESES: {
            let controlChar = String.fromCharCode(code);
            currentToken = [controlChar, controlChar, pos];
            break;
          }
          case OPEN_PARENTHESES: {
            RE_QUOTED.lastIndex = pos + 1;
            if (RE_URL_NAME.test(css.substring(pos - 4, pos)) && !RE_QUOTED.test(css)) {
              next = pos;
              do {
                escaped = false;
                next = css.indexOf(")", next + 1);
                if (next === -1) {
                  if (ignore || ignoreUnclosed) {
                    next = pos;
                    break;
                  } else {
                    unclosed("bracket");
                  }
                }
                escapePos = next;
                while (css.charCodeAt(escapePos - 1) === BACKSLASH) {
                  escapePos -= 1;
                  escaped = !escaped;
                }
              } while (escaped);
              currentToken = ["brackets", css.slice(pos, next + 1), pos, next];
              pos = next;
            } else if (pos <= lastBadParen) {
              currentToken = ["(", "(", pos];
            } else {
              next = css.indexOf(")", pos + 1);
              content = css.slice(pos, next + 1);
              if (next === -1 || RE_BAD_BRACKET.test(content)) {
                lastBadParen = next === -1 ? length : next;
                currentToken = ["(", "(", pos];
              } else {
                currentToken = ["brackets", content, pos, next];
                pos = next;
              }
            }
            break;
          }
          case SINGLE_QUOTE:
          case DOUBLE_QUOTE: {
            quote = code === SINGLE_QUOTE ? "'" : '"';
            next = pos;
            do {
              escaped = false;
              next = css.indexOf(quote, next + 1);
              if (next === -1) {
                if (ignore || ignoreUnclosed) {
                  next = pos + 1;
                  break;
                } else {
                  unclosed("string");
                }
              }
              escapePos = next;
              while (css.charCodeAt(escapePos - 1) === BACKSLASH) {
                escapePos -= 1;
                escaped = !escaped;
              }
            } while (escaped);
            currentToken = ["string", css.slice(pos, next + 1), pos, next];
            pos = next;
            break;
          }
          case AT: {
            RE_AT_END.lastIndex = pos + 1;
            RE_AT_END.test(css);
            if (RE_AT_END.lastIndex === 0) {
              next = css.length - 1;
            } else {
              next = RE_AT_END.lastIndex - 2;
            }
            currentToken = ["at-word", css.slice(pos, next + 1), pos, next];
            pos = next;
            break;
          }
          case BACKSLASH: {
            next = pos;
            escape2 = true;
            while (css.charCodeAt(next + 1) === BACKSLASH) {
              next += 1;
              escape2 = !escape2;
            }
            code = css.charCodeAt(next + 1);
            if (escape2 && code !== SLASH && code !== SPACE && code !== NEWLINE && code !== TAB && code !== CR && code !== FEED) {
              next += 1;
              if (RE_HEX_ESCAPE.test(css.charAt(next))) {
                while (RE_HEX_ESCAPE.test(css.charAt(next + 1))) {
                  next += 1;
                }
                if (css.charCodeAt(next + 1) === SPACE) {
                  next += 1;
                }
              }
            }
            currentToken = ["word", css.slice(pos, next + 1), pos, next];
            pos = next;
            break;
          }
          default: {
            if (code === SLASH && css.charCodeAt(pos + 1) === ASTERISK) {
              next = css.indexOf("*/", pos + 2) + 1;
              if (next === 0) {
                if (ignore || ignoreUnclosed) {
                  next = css.length;
                } else {
                  unclosed("comment");
                }
              }
              currentToken = ["comment", css.slice(pos, next + 1), pos, next];
              pos = next;
            } else {
              RE_WORD_END.lastIndex = pos + 1;
              RE_WORD_END.test(css);
              if (RE_WORD_END.lastIndex === 0) {
                next = css.length - 1;
              } else {
                next = RE_WORD_END.lastIndex - 2;
              }
              currentToken = ["word", css.slice(pos, next + 1), pos, next];
              pos = next;
            }
            break;
          }
        }
        pos++;
        return currentToken;
      }
      function back(token) {
        returned.push(token);
      }
      return {
        back,
        endOfFile,
        nextToken,
        position
      };
    };
  }
});

// node_modules/postcss/lib/terminal-highlight.js
var require_terminal_highlight = __commonJS({
  "node_modules/postcss/lib/terminal-highlight.js"(exports, module) {
    "use strict";
    var pico = require_picocolors();
    var tokenizer = require_tokenize();
    var Input;
    function registerInput(dependant) {
      Input = dependant;
    }
    var HIGHLIGHT_THEME = {
      ";": pico.yellow,
      ":": pico.yellow,
      "(": pico.cyan,
      ")": pico.cyan,
      "[": pico.yellow,
      "]": pico.yellow,
      "{": pico.yellow,
      "}": pico.yellow,
      "at-word": pico.cyan,
      "brackets": pico.cyan,
      "call": pico.cyan,
      "class": pico.yellow,
      "comment": pico.gray,
      "hash": pico.magenta,
      "string": pico.green
    };
    function getTokenType([type, value], processor) {
      if (type === "word") {
        if (value[0] === ".") {
          return "class";
        }
        if (value[0] === "#") {
          return "hash";
        }
      }
      if (!processor.endOfFile()) {
        let next = processor.nextToken();
        processor.back(next);
        if (next[0] === "brackets" || next[0] === "(") return "call";
      }
      return type;
    }
    function terminalHighlight(css) {
      let processor = tokenizer(new Input(css), { ignoreErrors: true });
      let result = "";
      while (!processor.endOfFile()) {
        let token = processor.nextToken();
        let color = HIGHLIGHT_THEME[getTokenType(token, processor)];
        if (color) {
          result += token[1].split(/\r?\n/).map((i) => color(i)).join("\n");
        } else {
          result += token[1];
        }
      }
      return result;
    }
    terminalHighlight.registerInput = registerInput;
    module.exports = terminalHighlight;
  }
});

// node_modules/postcss/lib/css-syntax-error.js
var require_css_syntax_error = __commonJS({
  "node_modules/postcss/lib/css-syntax-error.js"(exports, module) {
    "use strict";
    var pico = require_picocolors();
    var terminalHighlight = require_terminal_highlight();
    var CssSyntaxError = class _CssSyntaxError extends Error {
      constructor(message, line, column, source, file, plugin) {
        super(message);
        this.name = "CssSyntaxError";
        this.reason = message;
        if (file) {
          this.file = file;
        }
        if (source) {
          this.source = source;
        }
        if (plugin) {
          this.plugin = plugin;
        }
        if (typeof line !== "undefined" && typeof column !== "undefined") {
          if (typeof line === "number") {
            this.line = line;
            this.column = column;
          } else {
            this.line = line.line;
            this.column = line.column;
            this.endLine = column.line;
            this.endColumn = column.column;
          }
        }
        this.setMessage();
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, _CssSyntaxError);
        }
      }
      setMessage() {
        this.message = this.plugin ? this.plugin + ": " : "";
        this.message += this.file ? this.file : "<css input>";
        if (typeof this.line !== "undefined") {
          this.message += ":" + this.line + ":" + this.column;
        }
        this.message += ": " + this.reason;
      }
      showSourceCode(color) {
        if (!this.source) return "";
        let css = this.source;
        if (color == null) color = pico.isColorSupported;
        let aside = (text) => text;
        let mark = (text) => text;
        let highlight = (text) => text;
        if (color) {
          let { bold, gray, red } = pico.createColors(true);
          mark = (text) => bold(red(text));
          aside = (text) => gray(text);
          if (terminalHighlight) {
            highlight = (text) => terminalHighlight(text);
          }
        }
        let lines = css.split(/\r?\n/);
        let start = Math.max(this.line - 3, 0);
        let end = Math.min(this.line + 2, lines.length);
        let maxWidth = String(end).length;
        return lines.slice(start, end).map((line, index) => {
          let number = start + 1 + index;
          let gutter = " " + (" " + number).slice(-maxWidth) + " | ";
          if (number === this.line) {
            if (line.length > 160) {
              let padding = 20;
              let endColumn = typeof this.endColumn === "number" ? this.endColumn : this.column;
              let subLineStart = Math.max(0, this.column - padding);
              let subLineEnd = Math.max(this.column + padding, endColumn + padding);
              let subLine = line.slice(subLineStart, subLineEnd);
              let spacing2 = aside(gutter.replace(/\d/g, " ")) + line.slice(0, Math.min(this.column - 1, padding - 1)).replace(/[^\t]/g, " ");
              return mark(">") + aside(gutter) + highlight(subLine) + "\n " + spacing2 + mark("^");
            }
            let spacing = aside(gutter.replace(/\d/g, " ")) + line.slice(0, this.column - 1).replace(/[^\t]/g, " ");
            return mark(">") + aside(gutter) + highlight(line) + "\n " + spacing + mark("^");
          }
          return " " + aside(gutter) + highlight(line);
        }).join("\n");
      }
      toString() {
        let code = this.showSourceCode();
        if (code) {
          code = "\n\n" + code + "\n";
        }
        return this.name + ": " + this.message + code;
      }
    };
    module.exports = CssSyntaxError;
    CssSyntaxError.default = CssSyntaxError;
  }
});

// node_modules/postcss/lib/stringifier.js
var require_stringifier = __commonJS({
  "node_modules/postcss/lib/stringifier.js"(exports, module) {
    "use strict";
    var AT_NAME_END = /[\t\n\f\r "#'()/;[\\\]{}]/;
    var DEFAULT_RAW = {
      after: "\n",
      beforeClose: "\n",
      beforeComment: "\n",
      beforeDecl: "\n",
      beforeOpen: " ",
      beforeRule: "\n",
      colon: ": ",
      commentLeft: " ",
      commentRight: " ",
      emptyBody: "",
      indent: "    ",
      semicolon: false
    };
    function capitalize(str) {
      return str[0].toUpperCase() + str.slice(1);
    }
    function atruleStart(str, node) {
      let name = "@" + node.name;
      let params = node.params ? str.rawValue(node, "params") : "";
      let afterName = node.raws.afterName;
      if (typeof afterName === "undefined") {
        afterName = params ? " " : "";
      } else if (afterName === "" && params && !AT_NAME_END.test(params[0])) {
        afterName = " ";
      }
      return name + afterName + params;
    }
    function isCustomProperty(node) {
      if (!node.prop.startsWith("--")) return false;
      let before = node.raws.before;
      return typeof before === "undefined" || !/[^\s;]$/.test(before);
    }
    function pushBody(str, stack, node) {
      let nodes = node.nodes;
      let last = nodes.length - 1;
      while (last > 0) {
        if (nodes[last].type !== "comment") break;
        last -= 1;
      }
      let semicolon = str.raw(node, "semicolon");
      let isDocument2 = node.type === "document";
      for (let i = nodes.length - 1; i >= 0; i--) {
        let child = nodes[i];
        let childSemicolon = last !== i || semicolon;
        if (!childSemicolon && i < nodes.length - 1 && (child.type === "atrule" && !child.nodes || child.type === "decl" && isCustomProperty(child))) {
          childSemicolon = true;
        }
        stack.push({
          document: isDocument2,
          node: child,
          semicolon: childSemicolon
        });
      }
    }
    function pushBlock(str, stack, node, start) {
      let between = str.raw(node, "between", "beforeOpen");
      str.builder(start + between + "{", node, "start");
      let hasNodes = node.nodes && node.nodes.length;
      let close = () => {
        let after = hasNodes ? str.raw(node, "after") : str.raw(node, "after", "emptyBody");
        if (after) str.builder(after);
        str.builder("}", node, "end");
        if (node.type === "rule" && node.raws.ownSemicolon) {
          str.builder(node.raws.ownSemicolon, node, "end");
        }
      };
      if (hasNodes) {
        stack.push(close);
        pushBody(str, stack, node);
      } else {
        close();
      }
    }
    var Stringifier = class _Stringifier {
      constructor(builder) {
        this.builder = builder;
      }
      atrule(node, semicolon) {
        let start = atruleStart(this, node);
        if (node.nodes) {
          this.block(node, start);
        } else {
          let end = (node.raws.between || "") + (semicolon ? ";" : "");
          this.builder(start + end, node);
        }
      }
      beforeAfter(node, detect) {
        let value;
        if (node.type === "decl") {
          value = this.raw(node, null, "beforeDecl");
        } else if (node.type === "comment") {
          value = this.raw(node, null, "beforeComment");
        } else if (detect === "before") {
          value = this.raw(node, null, "beforeRule");
        } else {
          value = this.raw(node, null, "beforeClose");
        }
        let buf = node.parent;
        let depth = 0;
        while (buf && buf.type !== "root") {
          depth += 1;
          buf = buf.parent;
        }
        if (value.includes("\n")) {
          let indent = this.raw(node, null, "indent");
          if (indent.length) {
            for (let step = 0; step < depth; step++) value += indent;
          }
        }
        return value;
      }
      block(node, start) {
        let between = this.raw(node, "between", "beforeOpen");
        this.builder(start + between + "{", node, "start");
        let after;
        if (node.nodes && node.nodes.length) {
          this.body(node);
          after = this.raw(node, "after");
        } else {
          after = this.raw(node, "after", "emptyBody");
        }
        if (after) this.builder(after);
        this.builder("}", node, "end");
      }
      body(node) {
        let proto = _Stringifier.prototype;
        let expandable = ["atrule", "block", "body", "rule", "stringify"].every(
          (method) => this[method] === proto[method]
        );
        let stack = [];
        pushBody(this, stack, node);
        while (stack.length > 0) {
          let entry = stack.pop();
          if (typeof entry === "function") {
            entry();
            continue;
          }
          let child = entry.node;
          let before = this.raw(child, "before");
          if (before) {
            this.builder(before);
          }
          if (expandable && child.type === "rule") {
            pushBlock(this, stack, child, this.rawValue(child, "selector"));
          } else if (expandable && child.type === "atrule" && child.nodes) {
            pushBlock(this, stack, child, atruleStart(this, child));
          } else {
            this.stringify(child, entry.semicolon);
          }
        }
      }
      comment(node) {
        let left = this.raw(node, "left", "commentLeft");
        let right = this.raw(node, "right", "commentRight");
        this.builder("/*" + left + node.text + right + "*/", node);
      }
      decl(node, semicolon) {
        let raws = node.raws;
        let between = this.raw(node, "between", "colon");
        let string = node.prop + between + this.rawValue(node, "value");
        if (node.important) {
          string += raws.important || " !important";
        }
        if (semicolon) string += ";";
        this.builder(string, node);
      }
      document(node) {
        this.body(node);
      }
      raw(node, own, detect) {
        let value;
        if (!detect) detect = own;
        if (own) {
          value = node.raws[own];
          if (typeof value !== "undefined") return value;
        }
        let parent = node.parent;
        if (detect === "before") {
          if (!parent || parent.type === "root" && parent.first === node) {
            return "";
          }
          if (parent && parent.type === "document") {
            return "";
          }
        }
        if (!parent) return DEFAULT_RAW[detect];
        let root = node.root();
        let cache = root.rawCache || (root.rawCache = {});
        if (typeof cache[detect] !== "undefined") {
          return cache[detect];
        }
        if (detect === "before" || detect === "after") {
          return this.beforeAfter(node, detect);
        } else {
          let method = "raw" + capitalize(detect);
          if (this[method]) {
            value = this[method](root, node);
          } else {
            root.walk((i) => {
              value = i.raws[own];
              if (typeof value !== "undefined") return false;
            });
          }
        }
        if (typeof value === "undefined") value = DEFAULT_RAW[detect];
        cache[detect] = value;
        return value;
      }
      rawBeforeClose(root) {
        let value;
        root.walk((i) => {
          if (i.nodes && i.nodes.length > 0) {
            if (typeof i.raws.after !== "undefined") {
              value = i.raws.after;
              if (value.includes("\n")) {
                value = value.replace(/[^\n]+$/, "");
              }
              return false;
            }
          }
        });
        if (value) value = value.replace(/\S/g, "");
        return value;
      }
      rawBeforeComment(root, node) {
        let value;
        root.walkComments((i) => {
          if (typeof i.raws.before !== "undefined") {
            value = i.raws.before;
            if (value.includes("\n")) {
              value = value.replace(/[^\n]+$/, "");
            }
            return false;
          }
        });
        if (typeof value === "undefined") {
          value = this.raw(node, null, "beforeDecl");
        } else if (value) {
          value = value.replace(/\S/g, "");
        }
        return value;
      }
      rawBeforeDecl(root, node) {
        let value;
        root.walkDecls((i) => {
          if (typeof i.raws.before !== "undefined") {
            value = i.raws.before;
            if (value.includes("\n")) {
              value = value.replace(/[^\n]+$/, "");
            }
            return false;
          }
        });
        if (typeof value === "undefined") {
          value = this.raw(node, null, "beforeRule");
        } else if (value) {
          value = value.replace(/\S/g, "");
        }
        return value;
      }
      rawBeforeOpen(root) {
        let value;
        root.walk((i) => {
          if (i.type !== "decl") {
            value = i.raws.between;
            if (typeof value !== "undefined") return false;
          }
        });
        return value;
      }
      rawBeforeRule(root) {
        let value;
        root.walk((i) => {
          if (i.nodes && (i.parent !== root || root.first !== i)) {
            if (typeof i.raws.before !== "undefined") {
              value = i.raws.before;
              if (value.includes("\n")) {
                value = value.replace(/[^\n]+$/, "");
              }
              return false;
            }
          }
        });
        if (value) value = value.replace(/\S/g, "");
        return value;
      }
      rawColon(root) {
        let value;
        root.walkDecls((i) => {
          if (typeof i.raws.between !== "undefined") {
            value = i.raws.between.replace(/[^\s:]/g, "");
            return false;
          }
        });
        return value;
      }
      rawEmptyBody(root) {
        let value;
        root.walk((i) => {
          if (i.nodes && i.nodes.length === 0) {
            value = i.raws.after;
            if (typeof value !== "undefined") return false;
          }
        });
        return value;
      }
      rawIndent(root) {
        if (root.raws.indent) return root.raws.indent;
        let value;
        root.walk((i) => {
          let p = i.parent;
          if (p && p !== root && p.parent && p.parent === root) {
            if (typeof i.raws.before !== "undefined") {
              let parts = i.raws.before.split("\n");
              value = parts[parts.length - 1];
              value = value.replace(/\S/g, "");
              return false;
            }
          }
        });
        return value;
      }
      rawSemicolon(root) {
        let value;
        root.walk((i) => {
          if (i.nodes && i.nodes.length && i.last.type === "decl") {
            value = i.raws.semicolon;
            if (typeof value !== "undefined") return false;
          }
        });
        return value;
      }
      rawValue(node, prop) {
        let value = node[prop];
        let raw = node.raws[prop];
        if (raw && raw.value === value) {
          return raw.raw;
        }
        return value;
      }
      root(node) {
        let inDocument = node.parent && node.parent.type === "document";
        if (!inDocument && node.source && node.source.input.hasBOM) {
          this.builder("\uFEFF", node, "start");
        }
        this.body(node);
        if (node.raws.after) {
          this.builder(node.raws.after);
        }
      }
      rule(node) {
        this.block(node, this.rawValue(node, "selector"));
        if (node.raws.ownSemicolon) {
          this.builder(node.raws.ownSemicolon, node, "end");
        }
      }
      stringify(node, semicolon) {
        if (!this[node.type]) {
          throw new Error(
            "Unknown AST node type " + node.type + ". Maybe you need to change PostCSS stringifier."
          );
        }
        this[node.type](node, semicolon);
      }
    };
    module.exports = Stringifier;
    Stringifier.default = Stringifier;
  }
});

// node_modules/postcss/lib/stringify.js
var require_stringify = __commonJS({
  "node_modules/postcss/lib/stringify.js"(exports, module) {
    "use strict";
    var Stringifier = require_stringifier();
    var STYLE_TAG = /(<)(\/?style\b)/gi;
    var COMMENT_OPEN = /(<)(!--)/g;
    function escapeHTMLInCSS(str) {
      if (!str.includes("<")) return str;
      return str.replace(STYLE_TAG, "\\3c $2").replace(COMMENT_OPEN, "\\3c $2");
    }
    function cutEscaped(chunks, css, escaped) {
      let parts = [];
      let at = 0;
      let into = 0;
      for (let i = 0; i < chunks.length; i += 3) {
        let from = into;
        let end = at + chunks[i].length;
        while (at < end) {
          if (css[at] === escaped[into]) {
            at += 1;
            into += 1;
          } else {
            at += 1;
            into += 4;
          }
        }
        parts.push(escaped.slice(from, into));
      }
      return parts;
    }
    var SafeStringifier = class extends Stringifier {
      escapeHTML(print) {
        let builder = this.builder;
        let chunks, css;
        this.builder = (str, child, type) => {
          if (chunks) {
            css += str;
            chunks.push(str, child, type);
          } else if (str.includes("<")) {
            css = str;
            chunks = [str, child, type];
          } else {
            builder(str, child, type);
          }
        };
        print();
        this.builder = builder;
        if (!chunks) return;
        let escaped = escapeHTMLInCSS(css);
        if (escaped === css) {
          for (let i = 0; i < chunks.length; i += 3) {
            builder(chunks[i], chunks[i + 1], chunks[i + 2]);
          }
        } else {
          let parts = cutEscaped(chunks, css, escaped);
          for (let i = 0; i < chunks.length; i += 3) {
            builder(parts[i / 3], chunks[i + 1], chunks[i + 2]);
          }
        }
      }
      root(node) {
        if (node.parent && node.parent.type === "document") {
          this.escapeHTML(() => this.body(node));
          if (node.raws.after) this.builder(node.raws.after);
        } else {
          this.escapeHTML(() => super.root(node));
        }
      }
    };
    function stringify(node, builder) {
      let str = new SafeStringifier(builder);
      if (node.type === "root" || node.type === "document") {
        str.stringify(node);
      } else {
        str.escapeHTML(() => str.stringify(node));
      }
    }
    module.exports = stringify;
    stringify.default = stringify;
  }
});

// node_modules/postcss/lib/symbols.js
var require_symbols = __commonJS({
  "node_modules/postcss/lib/symbols.js"(exports, module) {
    "use strict";
    module.exports.isClean = /* @__PURE__ */ Symbol("isClean");
    module.exports.my = /* @__PURE__ */ Symbol("my");
  }
});

// node_modules/postcss/lib/node.js
var require_node = __commonJS({
  "node_modules/postcss/lib/node.js"(exports, module) {
    "use strict";
    var CssSyntaxError = require_css_syntax_error();
    var Stringifier = require_stringifier();
    var stringify = require_stringify();
    var { isClean, my } = require_symbols();
    function cloneNode2(obj, parent) {
      let cloned = new obj.constructor();
      let stack = [[obj, cloned, parent]];
      while (stack.length > 0) {
        let [source, target, targetParent] = stack.pop();
        for (let i in source) {
          if (!Object.prototype.hasOwnProperty.call(source, i)) {
            continue;
          }
          if (i === "proxyCache") continue;
          let value = source[i];
          let type = typeof value;
          if (i === "parent" && type === "object") {
            if (targetParent) target[i] = targetParent;
          } else if (i === "source") {
            target[i] = value;
          } else if (Array.isArray(value)) {
            let children = [];
            target[i] = children;
            for (let j of value) {
              let childClone = new j.constructor();
              children.push(childClone);
              stack.push([j, childClone, target]);
            }
          } else {
            if (type === "object" && value !== null) {
              let valueClone = new value.constructor();
              stack.push([value, valueClone, void 0]);
              value = valueClone;
            }
            target[i] = value;
          }
        }
      }
      return cloned;
    }
    function sourceOffset(inputCSS, position) {
      if (position && typeof position.offset !== "undefined") {
        return position.offset;
      }
      let column = 1;
      let line = 1;
      let offset = 0;
      for (let i = 0; i < inputCSS.length; i++) {
        if (line === position.line && column === position.column) {
          offset = i;
          break;
        }
        if (inputCSS[i] === "\n") {
          column = 1;
          line += 1;
        } else {
          column += 1;
        }
      }
      return offset;
    }
    var Node2 = class _Node {
      get proxyOf() {
        return this;
      }
      constructor(defaults = {}) {
        this.raws = {};
        this[isClean] = false;
        this[my] = true;
        for (let name of Object.keys(defaults)) {
          if (name === "__proto__") continue;
          if (name === "nodes") {
            this.nodes = [];
            for (let node of defaults[name]) {
              if (typeof node.clone === "function" && node.parent) {
                this.append(node.clone());
              } else {
                this.append(node);
              }
            }
          } else {
            this[name] = defaults[name];
          }
        }
      }
      addToError(error) {
        error.postcssNode = this;
        if (error.stack && this.source && /\n\s{4}at /.test(error.stack)) {
          let s = this.source;
          error.stack = error.stack.replace(
            /\n\s{4}at /,
            `$&${s.input.from}:${s.start.line}:${s.start.column}$&`
          );
        }
        return error;
      }
      after(add) {
        this.parent.insertAfter(this, add);
        return this;
      }
      assign(overrides = {}) {
        for (let name in overrides) {
          this[name] = overrides[name];
        }
        return this;
      }
      before(add) {
        this.parent.insertBefore(this, add);
        return this;
      }
      cleanRaws(keepBetween) {
        delete this.raws.before;
        delete this.raws.after;
        if (!keepBetween) delete this.raws.between;
      }
      clone(overrides = {}) {
        let cloned = cloneNode2(this);
        for (let name in overrides) {
          cloned[name] = overrides[name];
        }
        return cloned;
      }
      cloneAfter(overrides = {}) {
        let cloned = this.clone(overrides);
        this.parent.insertAfter(this, cloned);
        return cloned;
      }
      cloneBefore(overrides = {}) {
        let cloned = this.clone(overrides);
        this.parent.insertBefore(this, cloned);
        return cloned;
      }
      error(message, opts = {}) {
        if (this.source) {
          let { end, start } = this.rangeBy(opts);
          return this.source.input.error(
            message,
            { column: start.column, line: start.line },
            { column: end.column, line: end.line },
            opts
          );
        }
        return new CssSyntaxError(message);
      }
      getProxyProcessor() {
        return {
          get(node, prop) {
            if (prop === "proxyOf") {
              return node;
            } else if (prop === "root") {
              return () => node.root().toProxy();
            } else {
              return node[prop];
            }
          },
          set(node, prop, value) {
            if (node[prop] === value) return true;
            node[prop] = value;
            if (prop === "prop" || prop === "value" || prop === "name" || prop === "params" || prop === "important" || /* c8 ignore next */
            prop === "text") {
              node.markDirty();
            }
            return true;
          }
        };
      }
      /* c8 ignore next 3 */
      markClean() {
        this[isClean] = true;
      }
      markDirty() {
        if (this[isClean]) {
          this[isClean] = false;
          let next = this;
          while (next = next.parent) {
            next[isClean] = false;
          }
        }
      }
      next() {
        if (!this.parent) return void 0;
        let index = this.parent.index(this);
        return this.parent.nodes[index + 1];
      }
      positionBy(opts = {}) {
        let inputString = "document" in this.source.input ? this.source.input.document : this.source.input.css;
        let pos = {
          column: this.source.start.column,
          line: this.source.start.line,
          offset: sourceOffset(inputString, this.source.start)
        };
        if (opts.index) {
          pos = this.positionInside(opts.index);
        } else if (opts.word) {
          let stringRepresentation = inputString.slice(
            sourceOffset(inputString, this.source.start),
            this.rangeBy().end.offset
          );
          let index = stringRepresentation.indexOf(opts.word);
          if (index !== -1) pos = this.positionInside(index);
        }
        return pos;
      }
      positionInside(index) {
        let column = this.source.start.column;
        let line = this.source.start.line;
        let inputString = "document" in this.source.input ? this.source.input.document : this.source.input.css;
        let offset = sourceOffset(inputString, this.source.start);
        let end = offset + index;
        for (let i = offset; i < end; i++) {
          if (inputString[i] === "\n") {
            column = 1;
            line += 1;
          } else {
            column += 1;
          }
        }
        return { column, line, offset: end };
      }
      prev() {
        if (!this.parent) return void 0;
        let index = this.parent.index(this);
        return this.parent.nodes[index - 1];
      }
      rangeBy(opts = {}) {
        let inputString = "document" in this.source.input ? this.source.input.document : this.source.input.css;
        let start = {
          column: this.source.start.column,
          line: this.source.start.line,
          offset: sourceOffset(inputString, this.source.start)
        };
        let end = this.source.end ? {
          column: this.source.end.column + 1,
          line: this.source.end.line,
          offset: typeof this.source.end.offset === "number" ? (
            // `source.end.offset` is exclusive, so we don't need to add 1
            this.source.end.offset
          ) : (
            // Since line/column in this.source.end is inclusive,
            // the `sourceOffset(... , this.source.end)` returns an inclusive offset.
            // So, we add 1 to convert it to exclusive.
            sourceOffset(inputString, this.source.end) + 1
          )
        } : {
          column: start.column + 1,
          line: start.line,
          offset: start.offset + 1
        };
        if (opts.word) {
          let stringRepresentation = inputString.slice(
            sourceOffset(inputString, this.source.start),
            end.offset
          );
          let index = stringRepresentation.indexOf(opts.word);
          if (index !== -1) {
            start = this.positionInside(index);
            end = this.positionInside(index + opts.word.length);
          }
        } else {
          if (opts.start) {
            start = {
              column: opts.start.column,
              line: opts.start.line,
              offset: sourceOffset(inputString, opts.start)
            };
          } else if (typeof opts.index === "number") {
            start = this.positionInside(opts.index);
          }
          if (opts.end) {
            end = {
              column: opts.end.column,
              line: opts.end.line,
              offset: sourceOffset(inputString, opts.end)
            };
          } else if (typeof opts.endIndex === "number") {
            end = this.positionInside(opts.endIndex);
          } else if (typeof opts.index === "number") {
            end = this.positionInside(opts.index + 1);
          }
        }
        if (end.line < start.line || end.line === start.line && end.column <= start.column) {
          end = {
            column: start.column + 1,
            line: start.line,
            offset: start.offset + 1
          };
        }
        return { end, start };
      }
      raw(prop, defaultType) {
        let str = new Stringifier();
        return str.raw(this, prop, defaultType);
      }
      remove() {
        if (this.parent) {
          this.parent.removeChild(this);
        }
        this.parent = void 0;
        return this;
      }
      replaceWith(...nodes) {
        if (this.parent) {
          let bookmark = this;
          let foundSelf = false;
          for (let node of nodes) {
            if (node === this) {
              foundSelf = true;
            } else if (foundSelf) {
              this.parent.insertAfter(bookmark, node);
              bookmark = node;
            } else {
              this.parent.insertBefore(bookmark, node);
            }
          }
          if (!foundSelf) {
            this.remove();
          }
        }
        return this;
      }
      root() {
        let result = this;
        while (result.parent && result.parent.type !== "document") {
          result = result.parent;
        }
        return result;
      }
      toJSON(_, inputs) {
        let emitInputs = inputs == null;
        inputs = inputs || /* @__PURE__ */ new Map();
        let holderOfRoot = [];
        let queue = [[this, holderOfRoot, 0]];
        for (let step = 0; step < queue.length; step++) {
          let [node, holder, key] = queue[step];
          let fixed2 = {};
          holder[key] = fixed2;
          for (let name in node) {
            if (!Object.prototype.hasOwnProperty.call(node, name)) {
              continue;
            }
            if (name === "parent" || name === "proxyCache") continue;
            let value = node[name];
            if (Array.isArray(value)) {
              let fixedArray = [];
              fixed2[name] = fixedArray;
              for (let i = 0; i < value.length; i++) {
                let item = value[i];
                if (typeof item === "object" && item.toJSON) {
                  if (item.toJSON === _Node.prototype.toJSON) {
                    queue.push([item, fixedArray, i]);
                  } else {
                    fixedArray[i] = item.toJSON(null, inputs);
                  }
                } else {
                  fixedArray[i] = item;
                }
              }
            } else if (typeof value === "object" && value.toJSON) {
              if (value.toJSON === _Node.prototype.toJSON) {
                queue.push([value, fixed2, name]);
              } else {
                fixed2[name] = value.toJSON(null, inputs);
              }
            } else if (name === "source") {
              if (value == null) continue;
              let inputId = inputs.get(value.input);
              if (inputId == null) {
                inputId = inputs.size;
                inputs.set(value.input, inputId);
              }
              fixed2[name] = {
                end: value.end,
                inputId,
                start: value.start
              };
            } else {
              fixed2[name] = value;
            }
          }
        }
        let fixed = holderOfRoot[0];
        if (emitInputs) {
          fixed.inputs = [...inputs.keys()].map((input) => input.toJSON());
        }
        return fixed;
      }
      toProxy() {
        if (!this.proxyCache) {
          this.proxyCache = new Proxy(this, this.getProxyProcessor());
        }
        return this.proxyCache;
      }
      toString(stringifier = stringify) {
        if (stringifier.stringify) stringifier = stringifier.stringify;
        let result = "";
        stringifier(this, (i) => {
          result += i;
        });
        return result;
      }
      warn(result, text, opts = {}) {
        let data = { node: this };
        for (let i in opts) data[i] = opts[i];
        return result.warn(text, data);
      }
    };
    module.exports = Node2;
    Node2.default = Node2;
  }
});

// node_modules/postcss/lib/comment.js
var require_comment = __commonJS({
  "node_modules/postcss/lib/comment.js"(exports, module) {
    "use strict";
    var Node2 = require_node();
    var Comment3 = class extends Node2 {
      constructor(defaults) {
        super(defaults);
        this.type = "comment";
      }
    };
    module.exports = Comment3;
    Comment3.default = Comment3;
  }
});

// node_modules/postcss/lib/declaration.js
var require_declaration = __commonJS({
  "node_modules/postcss/lib/declaration.js"(exports, module) {
    "use strict";
    var Node2 = require_node();
    var Declaration = class extends Node2 {
      get variable() {
        return this.prop.startsWith("--") || this.prop[0] === "$";
      }
      constructor(defaults) {
        if (defaults && typeof defaults.value !== "undefined" && typeof defaults.value !== "string") {
          defaults = { ...defaults, value: String(defaults.value) };
        }
        super(defaults);
        this.type = "decl";
      }
    };
    module.exports = Declaration;
    Declaration.default = Declaration;
  }
});

// node_modules/postcss/lib/container.js
var require_container = __commonJS({
  "node_modules/postcss/lib/container.js"(exports, module) {
    "use strict";
    var Comment3 = require_comment();
    var Declaration = require_declaration();
    var Node2 = require_node();
    var { isClean, my } = require_symbols();
    var AtRule;
    var parse;
    var Root2;
    var Rule;
    function cleanSource(nodes) {
      let stack = nodes.slice();
      while (stack.length > 0) {
        let node = stack.pop();
        delete node.source;
        if (node.nodes) {
          node.nodes = node.nodes.slice();
          for (let i of node.nodes) stack.push(i);
        }
      }
      return nodes.slice();
    }
    function markTreeDirty(node) {
      let stack = [node];
      while (stack.length > 0) {
        let next = stack.pop();
        next[isClean] = false;
        if (next.proxyOf.nodes) {
          for (let i of next.proxyOf.nodes) stack.push(i);
        }
      }
    }
    var Container = class _Container extends Node2 {
      get first() {
        if (!this.proxyOf.nodes) return void 0;
        return this.proxyOf.nodes[0];
      }
      get last() {
        if (!this.proxyOf.nodes) return void 0;
        return this.proxyOf.nodes[this.proxyOf.nodes.length - 1];
      }
      append(...children) {
        for (let child of children) {
          let nodes = this.normalize(child, this.last);
          for (let node of nodes) this.proxyOf.nodes.push(node);
        }
        this.markDirty();
        return this;
      }
      cleanRaws(keepBetween) {
        let stack = [this];
        while (stack.length > 0) {
          let node = stack.pop();
          if (node !== this && node.cleanRaws !== _Container.prototype.cleanRaws) {
            node.cleanRaws(keepBetween);
            continue;
          }
          Node2.prototype.cleanRaws.call(node, keepBetween);
          if (node.nodes) {
            for (let child of node.nodes) stack.push(child);
          }
        }
      }
      each(callback) {
        if (!this.proxyOf.nodes) return void 0;
        let iterator = this.getIterator();
        let index, result;
        while (this.indexes[iterator] < this.proxyOf.nodes.length) {
          index = this.indexes[iterator];
          result = callback(this.proxyOf.nodes[index], index);
          if (result === false) break;
          this.indexes[iterator] += 1;
        }
        delete this.indexes[iterator];
        return result;
      }
      every(condition) {
        return this.nodes.every(condition);
      }
      getIterator() {
        if (!this.lastEach) this.lastEach = 0;
        if (!this.indexes) this.indexes = {};
        this.lastEach += 1;
        let iterator = this.lastEach;
        this.indexes[iterator] = 0;
        return iterator;
      }
      getProxyProcessor() {
        return {
          get(node, prop) {
            if (prop === "proxyOf") {
              return node;
            } else if (!node[prop]) {
              return node[prop];
            } else if (prop === "each" || typeof prop === "string" && prop.startsWith("walk")) {
              return (...args) => {
                return node[prop](
                  ...args.map((i) => {
                    if (typeof i === "function") {
                      return (child, index) => i(child.toProxy(), index);
                    } else {
                      return i;
                    }
                  })
                );
              };
            } else if (prop === "every" || prop === "some") {
              return (cb) => {
                return node[prop](
                  (child, ...other) => cb(child.toProxy(), ...other)
                );
              };
            } else if (prop === "root") {
              return () => node.root().toProxy();
            } else if (prop === "nodes") {
              return node.nodes.map((i) => i.toProxy());
            } else if (prop === "first" || prop === "last") {
              return node[prop].toProxy();
            } else {
              return node[prop];
            }
          },
          set(node, prop, value) {
            if (node[prop] === value) return true;
            node[prop] = value;
            if (prop === "name" || prop === "params" || prop === "selector") {
              node.markDirty();
            }
            return true;
          }
        };
      }
      index(child) {
        if (typeof child === "number") return child;
        if (child.proxyOf) child = child.proxyOf;
        return this.proxyOf.nodes.indexOf(child);
      }
      insertAfter(exist, add) {
        let existIndex = this.index(exist);
        let nodes = this.normalize(add, this.proxyOf.nodes[existIndex]).reverse();
        existIndex = this.index(exist);
        for (let node of nodes) this.proxyOf.nodes.splice(existIndex + 1, 0, node);
        let index;
        for (let id in this.indexes) {
          index = this.indexes[id];
          if (existIndex < index) {
            this.indexes[id] = index + nodes.length;
          }
        }
        this.markDirty();
        return this;
      }
      insertBefore(exist, add) {
        let existIndex = this.index(exist);
        let type = existIndex === 0 ? "prepend" : false;
        let nodes = this.normalize(
          add,
          this.proxyOf.nodes[existIndex],
          type
        ).reverse();
        existIndex = this.index(exist);
        for (let node of nodes) this.proxyOf.nodes.splice(existIndex, 0, node);
        let index;
        for (let id in this.indexes) {
          index = this.indexes[id];
          if (existIndex <= index) {
            this.indexes[id] = index + nodes.length;
          }
        }
        this.markDirty();
        return this;
      }
      normalize(nodes, sample) {
        if (typeof nodes === "string") {
          nodes = cleanSource(parse(nodes).nodes);
        } else if (typeof nodes === "undefined") {
          nodes = [];
        } else if (Array.isArray(nodes)) {
          nodes = nodes.slice(0);
          for (let i of nodes) {
            if (i.parent) i.parent.removeChild(i, "ignore");
          }
        } else if (nodes.type === "root" && this.type !== "document") {
          nodes = nodes.nodes.slice(0);
          for (let i of nodes) {
            if (i.parent) i.parent.removeChild(i, "ignore");
          }
        } else if (nodes.type) {
          nodes = [nodes];
        } else if (nodes.prop) {
          if (typeof nodes.value === "undefined") {
            throw new Error("Value field is missed in node creation");
          } else if (typeof nodes.value !== "string") {
            nodes.value = String(nodes.value);
          }
          nodes = [new Declaration(nodes)];
        } else if (nodes.selector || nodes.selectors) {
          nodes = [new Rule(nodes)];
        } else if (nodes.name) {
          nodes = [new AtRule(nodes)];
        } else if (nodes.text) {
          nodes = [new Comment3(nodes)];
        } else {
          throw new Error("Unknown node type in node creation");
        }
        let processed = nodes.map((i) => {
          if (!i[my]) _Container.rebuild(i);
          i = i.proxyOf;
          if (i.parent) i.parent.removeChild(i);
          if (i[isClean]) markTreeDirty(i);
          if (!i.raws) i.raws = {};
          if (typeof i.raws.before === "undefined") {
            if (sample && typeof sample.raws.before !== "undefined") {
              i.raws.before = sample.raws.before.replace(/\S/g, "");
            }
          }
          i.parent = this.proxyOf;
          return i;
        });
        return processed;
      }
      prepend(...children) {
        children = children.reverse();
        for (let child of children) {
          let nodes = this.normalize(child, this.first, "prepend").reverse();
          for (let node of nodes) this.proxyOf.nodes.unshift(node);
          for (let id in this.indexes) {
            this.indexes[id] = this.indexes[id] + nodes.length;
          }
        }
        this.markDirty();
        return this;
      }
      push(child) {
        child.parent = this;
        this.proxyOf.nodes.push(child);
        return this;
      }
      removeAll() {
        for (let node of this.proxyOf.nodes) node.parent = void 0;
        this.proxyOf.nodes = [];
        this.markDirty();
        return this;
      }
      removeChild(child) {
        child = this.index(child);
        this.proxyOf.nodes[child].parent = void 0;
        this.proxyOf.nodes.splice(child, 1);
        let index;
        for (let id in this.indexes) {
          index = this.indexes[id];
          if (index >= child) {
            this.indexes[id] = index - 1;
          }
        }
        this.markDirty();
        return this;
      }
      replaceValues(pattern, opts, callback) {
        if (!callback) {
          callback = opts;
          opts = {};
        }
        this.walkDecls((decl) => {
          if (opts.props && !opts.props.includes(decl.prop)) return;
          if (opts.fast && !decl.value.includes(opts.fast)) return;
          decl.value = decl.value.replace(pattern, callback);
        });
        this.markDirty();
        return this;
      }
      some(condition) {
        return this.nodes.some(condition);
      }
      walk(callback) {
        if (!this.proxyOf.nodes) return void 0;
        let stack = [{ iterator: this.getIterator(), node: this.proxyOf }];
        while (stack.length > 0) {
          let { iterator, node } = stack[stack.length - 1];
          let index = node.indexes[iterator];
          if (index >= node.proxyOf.nodes.length) {
            delete node.indexes[iterator];
            stack.pop();
            let parent = stack[stack.length - 1];
            if (parent) parent.node.indexes[parent.iterator] += 1;
            continue;
          }
          let child = node.proxyOf.nodes[index];
          let result;
          try {
            result = callback(child, index);
          } catch (e) {
            throw child.addToError(e);
          }
          if (result === false) {
            for (let opened of stack) {
              delete opened.node.indexes[opened.iterator];
            }
            return false;
          }
          if (child.walk && child.proxyOf.nodes) {
            stack.push({ iterator: child.getIterator(), node: child });
          } else {
            node.indexes[iterator] += 1;
          }
        }
        return void 0;
      }
      walkAtRules(name, callback) {
        if (!callback) {
          callback = name;
          return this.walk((child, i) => {
            if (child.type === "atrule") {
              return callback(child, i);
            }
          });
        }
        if (name instanceof RegExp) {
          return this.walk((child, i) => {
            if (child.type === "atrule" && name.test(child.name)) {
              return callback(child, i);
            }
          });
        }
        return this.walk((child, i) => {
          if (child.type === "atrule" && child.name === name) {
            return callback(child, i);
          }
        });
      }
      walkComments(callback) {
        return this.walk((child, i) => {
          if (child.type === "comment") {
            return callback(child, i);
          }
        });
      }
      walkDecls(prop, callback) {
        if (!callback) {
          callback = prop;
          return this.walk((child, i) => {
            if (child.type === "decl") {
              return callback(child, i);
            }
          });
        }
        if (prop instanceof RegExp) {
          return this.walk((child, i) => {
            if (child.type === "decl" && prop.test(child.prop)) {
              return callback(child, i);
            }
          });
        }
        return this.walk((child, i) => {
          if (child.type === "decl" && child.prop === prop) {
            return callback(child, i);
          }
        });
      }
      walkRules(selector, callback) {
        if (!callback) {
          callback = selector;
          return this.walk((child, i) => {
            if (child.type === "rule") {
              return callback(child, i);
            }
          });
        }
        if (selector instanceof RegExp) {
          return this.walk((child, i) => {
            if (child.type === "rule" && selector.test(child.selector)) {
              return callback(child, i);
            }
          });
        }
        return this.walk((child, i) => {
          if (child.type === "rule" && child.selector === selector) {
            return callback(child, i);
          }
        });
      }
    };
    Container.registerParse = (dependant) => {
      parse = dependant;
    };
    Container.registerRule = (dependant) => {
      Rule = dependant;
    };
    Container.registerAtRule = (dependant) => {
      AtRule = dependant;
    };
    Container.registerRoot = (dependant) => {
      Root2 = dependant;
    };
    module.exports = Container;
    Container.default = Container;
    Container.rebuild = (node) => {
      let stack = [node];
      while (stack.length > 0) {
        let next = stack.pop();
        if (next.type === "atrule") {
          Object.setPrototypeOf(next, AtRule.prototype);
        } else if (next.type === "rule") {
          Object.setPrototypeOf(next, Rule.prototype);
        } else if (next.type === "decl") {
          Object.setPrototypeOf(next, Declaration.prototype);
        } else if (next.type === "comment") {
          Object.setPrototypeOf(next, Comment3.prototype);
        } else if (next.type === "root") {
          Object.setPrototypeOf(next, Root2.prototype);
        }
        next[my] = true;
        if (next.nodes) {
          for (let child of next.nodes) stack.push(child);
        }
      }
    };
  }
});

// node_modules/postcss/lib/at-rule.js
var require_at_rule = __commonJS({
  "node_modules/postcss/lib/at-rule.js"(exports, module) {
    "use strict";
    var Container = require_container();
    var AtRule = class extends Container {
      constructor(defaults) {
        super(defaults);
        this.type = "atrule";
      }
      append(...children) {
        if (!this.proxyOf.nodes) this.nodes = [];
        return super.append(...children);
      }
      prepend(...children) {
        if (!this.proxyOf.nodes) this.nodes = [];
        return super.prepend(...children);
      }
    };
    module.exports = AtRule;
    AtRule.default = AtRule;
    Container.registerAtRule(AtRule);
  }
});

// node_modules/postcss/lib/document.js
var require_document = __commonJS({
  "node_modules/postcss/lib/document.js"(exports, module) {
    "use strict";
    var Container = require_container();
    var LazyResult;
    var Processor;
    var Document2 = class extends Container {
      constructor(defaults) {
        super({ type: "document", ...defaults });
        if (!this.nodes) {
          this.nodes = [];
        }
      }
      toResult(opts = {}) {
        let lazy = new LazyResult(new Processor(), this, opts);
        return lazy.stringify();
      }
    };
    Document2.registerLazyResult = (dependant) => {
      LazyResult = dependant;
    };
    Document2.registerProcessor = (dependant) => {
      Processor = dependant;
    };
    module.exports = Document2;
    Document2.default = Document2;
  }
});

// node_modules/nanoid/non-secure/index.cjs
var require_non_secure = __commonJS({
  "node_modules/nanoid/non-secure/index.cjs"(exports, module) {
    var urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
    var customAlphabet = (alphabet, defaultSize = 21) => {
      return (size = defaultSize) => {
        let id = "";
        let i = size | 0;
        while (i-- > 0) {
          id += alphabet[Math.random() * alphabet.length | 0];
        }
        return id;
      };
    };
    var nanoid = (size = 21) => {
      let id = "";
      let i = size | 0;
      while (i-- > 0) {
        id += urlAlphabet[Math.random() * 64 | 0];
      }
      return id;
    };
    module.exports = { nanoid, customAlphabet };
  }
});

// node_modules/source-map-js/lib/base64.js
var require_base64 = __commonJS({
  "node_modules/source-map-js/lib/base64.js"(exports) {
    var intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
    exports.encode = function(number) {
      if (0 <= number && number < intToCharMap.length) {
        return intToCharMap[number];
      }
      throw new TypeError("Must be between 0 and 63: " + number);
    };
    exports.decode = function(charCode) {
      var bigA = 65;
      var bigZ = 90;
      var littleA = 97;
      var littleZ = 122;
      var zero = 48;
      var nine = 57;
      var plus = 43;
      var slash = 47;
      var littleOffset = 26;
      var numberOffset = 52;
      if (bigA <= charCode && charCode <= bigZ) {
        return charCode - bigA;
      }
      if (littleA <= charCode && charCode <= littleZ) {
        return charCode - littleA + littleOffset;
      }
      if (zero <= charCode && charCode <= nine) {
        return charCode - zero + numberOffset;
      }
      if (charCode == plus) {
        return 62;
      }
      if (charCode == slash) {
        return 63;
      }
      return -1;
    };
  }
});

// node_modules/source-map-js/lib/base64-vlq.js
var require_base64_vlq = __commonJS({
  "node_modules/source-map-js/lib/base64-vlq.js"(exports) {
    var base64 = require_base64();
    var VLQ_BASE_SHIFT = 5;
    var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
    var VLQ_BASE_MASK = VLQ_BASE - 1;
    var VLQ_CONTINUATION_BIT = VLQ_BASE;
    function toVLQSigned(aValue) {
      return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
    }
    function fromVLQSigned(aValue) {
      var isNegative = (aValue & 1) === 1;
      var shifted = aValue >> 1;
      return isNegative ? -shifted : shifted;
    }
    exports.encode = function base64VLQ_encode(aValue) {
      var encoded = "";
      var digit;
      var vlq = toVLQSigned(aValue);
      do {
        digit = vlq & VLQ_BASE_MASK;
        vlq >>>= VLQ_BASE_SHIFT;
        if (vlq > 0) {
          digit |= VLQ_CONTINUATION_BIT;
        }
        encoded += base64.encode(digit);
      } while (vlq > 0);
      return encoded;
    };
    exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
      var strLen = aStr.length;
      var result = 0;
      var shift = 0;
      var continuation, digit;
      do {
        if (aIndex >= strLen) {
          throw new Error("Expected more digits in base 64 VLQ value.");
        }
        digit = base64.decode(aStr.charCodeAt(aIndex++));
        if (digit === -1) {
          throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
        }
        continuation = !!(digit & VLQ_CONTINUATION_BIT);
        digit &= VLQ_BASE_MASK;
        result = result + (digit << shift);
        shift += VLQ_BASE_SHIFT;
      } while (continuation);
      aOutParam.value = fromVLQSigned(result);
      aOutParam.rest = aIndex;
    };
  }
});

// node_modules/source-map-js/lib/util.js
var require_util = __commonJS({
  "node_modules/source-map-js/lib/util.js"(exports) {
    function getArg(aArgs, aName, aDefaultValue) {
      if (aName in aArgs) {
        return aArgs[aName];
      } else if (arguments.length === 3) {
        return aDefaultValue;
      } else {
        throw new Error('"' + aName + '" is a required argument.');
      }
    }
    exports.getArg = getArg;
    var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
    var dataUrlRegexp = /^data:.+\,.+$/;
    function urlParse(aUrl) {
      var match = aUrl.match(urlRegexp);
      if (!match) {
        return null;
      }
      return {
        scheme: match[1],
        auth: match[2],
        host: match[3],
        port: match[4],
        path: match[5]
      };
    }
    exports.urlParse = urlParse;
    function urlGenerate(aParsedUrl) {
      var url = "";
      if (aParsedUrl.scheme) {
        url += aParsedUrl.scheme + ":";
      }
      url += "//";
      if (aParsedUrl.auth) {
        url += aParsedUrl.auth + "@";
      }
      if (aParsedUrl.host) {
        url += aParsedUrl.host;
      }
      if (aParsedUrl.port) {
        url += ":" + aParsedUrl.port;
      }
      if (aParsedUrl.path) {
        url += aParsedUrl.path;
      }
      return url;
    }
    exports.urlGenerate = urlGenerate;
    var MAX_CACHED_INPUTS = 32;
    function lruMemoize(f) {
      var cache = [];
      return function(input) {
        for (var i = 0; i < cache.length; i++) {
          if (cache[i].input === input) {
            var temp = cache[0];
            cache[0] = cache[i];
            cache[i] = temp;
            return cache[0].result;
          }
        }
        var result = f(input);
        cache.unshift({
          input,
          result
        });
        if (cache.length > MAX_CACHED_INPUTS) {
          cache.pop();
        }
        return result;
      };
    }
    var normalize = lruMemoize(function normalize2(aPath) {
      var path5 = aPath;
      var url = urlParse(aPath);
      if (url) {
        if (!url.path) {
          return aPath;
        }
        path5 = url.path;
      }
      var isAbsolute = exports.isAbsolute(path5);
      var parts = [];
      var start = 0;
      var i = 0;
      while (true) {
        start = i;
        i = path5.indexOf("/", start);
        if (i === -1) {
          parts.push(path5.slice(start));
          break;
        } else {
          parts.push(path5.slice(start, i));
          while (i < path5.length && path5[i] === "/") {
            i++;
          }
        }
      }
      for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
        part = parts[i];
        if (part === ".") {
          parts.splice(i, 1);
        } else if (part === "..") {
          up++;
        } else if (up > 0) {
          if (part === "") {
            parts.splice(i + 1, up);
            up = 0;
          } else {
            parts.splice(i, 2);
            up--;
          }
        }
      }
      path5 = parts.join("/");
      if (path5 === "") {
        path5 = isAbsolute ? "/" : ".";
      }
      if (url) {
        url.path = path5;
        return urlGenerate(url);
      }
      return path5;
    });
    exports.normalize = normalize;
    function join(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }
      if (aPath === "") {
        aPath = ".";
      }
      var aPathUrl = urlParse(aPath);
      var aRootUrl = urlParse(aRoot);
      if (aRootUrl) {
        aRoot = aRootUrl.path || "/";
      }
      if (aPathUrl && !aPathUrl.scheme) {
        if (aRootUrl) {
          aPathUrl.scheme = aRootUrl.scheme;
        }
        return urlGenerate(aPathUrl);
      }
      if (aPathUrl || aPath.match(dataUrlRegexp)) {
        return aPath;
      }
      if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
        aRootUrl.host = aPath;
        return urlGenerate(aRootUrl);
      }
      var joined = aPath.charAt(0) === "/" ? aPath : normalize(aRoot.replace(/\/+$/, "") + "/" + aPath);
      if (aRootUrl) {
        aRootUrl.path = joined;
        return urlGenerate(aRootUrl);
      }
      return joined;
    }
    exports.join = join;
    exports.isAbsolute = function(aPath) {
      return aPath.charAt(0) === "/" || urlRegexp.test(aPath);
    };
    function relative(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }
      aRoot = aRoot.replace(/\/$/, "");
      var level = 0;
      while (aPath.indexOf(aRoot + "/") !== 0) {
        var index = aRoot.lastIndexOf("/");
        if (index < 0) {
          return aPath;
        }
        aRoot = aRoot.slice(0, index);
        if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
          return aPath;
        }
        ++level;
      }
      return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
    }
    exports.relative = relative;
    var supportsNullProto = (function() {
      var obj = /* @__PURE__ */ Object.create(null);
      return !("__proto__" in obj);
    })();
    function identity(s) {
      return s;
    }
    function toSetString(aStr) {
      if (isProtoString(aStr)) {
        return "$" + aStr;
      }
      return aStr;
    }
    exports.toSetString = supportsNullProto ? identity : toSetString;
    function fromSetString(aStr) {
      if (isProtoString(aStr)) {
        return aStr.slice(1);
      }
      return aStr;
    }
    exports.fromSetString = supportsNullProto ? identity : fromSetString;
    function isProtoString(s) {
      if (!s) {
        return false;
      }
      var length = s.length;
      if (length < 9) {
        return false;
      }
      if (s.charCodeAt(length - 1) !== 95 || s.charCodeAt(length - 2) !== 95 || s.charCodeAt(length - 3) !== 111 || s.charCodeAt(length - 4) !== 116 || s.charCodeAt(length - 5) !== 111 || s.charCodeAt(length - 6) !== 114 || s.charCodeAt(length - 7) !== 112 || s.charCodeAt(length - 8) !== 95 || s.charCodeAt(length - 9) !== 95) {
        return false;
      }
      for (var i = length - 10; i >= 0; i--) {
        if (s.charCodeAt(i) !== 36) {
          return false;
        }
      }
      return true;
    }
    function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
      var cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0 || onlyCompareOriginal) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports.compareByOriginalPositions = compareByOriginalPositions;
    function compareByOriginalPositionsNoSource(mappingA, mappingB, onlyCompareOriginal) {
      var cmp;
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0 || onlyCompareOriginal) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports.compareByOriginalPositionsNoSource = compareByOriginalPositionsNoSource;
    function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0 || onlyCompareGenerated) {
        return cmp;
      }
      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;
    function compareByGeneratedPositionsDeflatedNoLine(mappingA, mappingB, onlyCompareGenerated) {
      var cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0 || onlyCompareGenerated) {
        return cmp;
      }
      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports.compareByGeneratedPositionsDeflatedNoLine = compareByGeneratedPositionsDeflatedNoLine;
    function strcmp(aStr1, aStr2) {
      if (aStr1 === aStr2) {
        return 0;
      }
      if (aStr1 === null) {
        return 1;
      }
      if (aStr2 === null) {
        return -1;
      }
      if (aStr1 > aStr2) {
        return 1;
      }
      return -1;
    }
    function compareByGeneratedPositionsInflated(mappingA, mappingB) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;
    function parseSourceMapInput(str) {
      return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
    }
    exports.parseSourceMapInput = parseSourceMapInput;
    function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
      sourceURL = sourceURL || "";
      if (sourceRoot) {
        if (sourceRoot[sourceRoot.length - 1] !== "/" && sourceURL[0] !== "/") {
          sourceRoot += "/";
        }
        sourceURL = sourceRoot + sourceURL;
      }
      if (sourceMapURL) {
        var parsed = urlParse(sourceMapURL);
        if (!parsed) {
          throw new Error("sourceMapURL could not be parsed");
        }
        if (parsed.path) {
          var index = parsed.path.lastIndexOf("/");
          if (index >= 0) {
            parsed.path = parsed.path.substring(0, index + 1);
          }
        }
        sourceURL = join(urlGenerate(parsed), sourceURL);
      }
      return normalize(sourceURL);
    }
    exports.computeSourceURL = computeSourceURL;
  }
});

// node_modules/source-map-js/lib/array-set.js
var require_array_set = __commonJS({
  "node_modules/source-map-js/lib/array-set.js"(exports) {
    var util = require_util();
    var has = Object.prototype.hasOwnProperty;
    var hasNativeMap = typeof Map !== "undefined";
    function ArraySet() {
      this._array = [];
      this._set = hasNativeMap ? /* @__PURE__ */ new Map() : /* @__PURE__ */ Object.create(null);
    }
    ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
      var set = new ArraySet();
      for (var i = 0, len = aArray.length; i < len; i++) {
        set.add(aArray[i], aAllowDuplicates);
      }
      return set;
    };
    ArraySet.prototype.size = function ArraySet_size() {
      return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
    };
    ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
      var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
      var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
      var idx = this._array.length;
      if (!isDuplicate || aAllowDuplicates) {
        this._array.push(aStr);
      }
      if (!isDuplicate) {
        if (hasNativeMap) {
          this._set.set(aStr, idx);
        } else {
          this._set[sStr] = idx;
        }
      }
    };
    ArraySet.prototype.has = function ArraySet_has(aStr) {
      if (hasNativeMap) {
        return this._set.has(aStr);
      } else {
        var sStr = util.toSetString(aStr);
        return has.call(this._set, sStr);
      }
    };
    ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
      if (hasNativeMap) {
        var idx = this._set.get(aStr);
        if (idx >= 0) {
          return idx;
        }
      } else {
        var sStr = util.toSetString(aStr);
        if (has.call(this._set, sStr)) {
          return this._set[sStr];
        }
      }
      throw new Error('"' + aStr + '" is not in the set.');
    };
    ArraySet.prototype.at = function ArraySet_at(aIdx) {
      if (aIdx >= 0 && aIdx < this._array.length) {
        return this._array[aIdx];
      }
      throw new Error("No element indexed by " + aIdx);
    };
    ArraySet.prototype.toArray = function ArraySet_toArray() {
      return this._array.slice();
    };
    exports.ArraySet = ArraySet;
  }
});

// node_modules/source-map-js/lib/mapping-list.js
var require_mapping_list = __commonJS({
  "node_modules/source-map-js/lib/mapping-list.js"(exports) {
    var util = require_util();
    function generatedPositionAfter(mappingA, mappingB) {
      var lineA = mappingA.generatedLine;
      var lineB = mappingB.generatedLine;
      var columnA = mappingA.generatedColumn;
      var columnB = mappingB.generatedColumn;
      return lineB > lineA || lineB == lineA && columnB >= columnA || util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
    }
    function MappingList() {
      this._array = [];
      this._sorted = true;
      this._last = { generatedLine: -1, generatedColumn: 0 };
    }
    MappingList.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
      this._array.forEach(aCallback, aThisArg);
    };
    MappingList.prototype.add = function MappingList_add(aMapping) {
      if (generatedPositionAfter(this._last, aMapping)) {
        this._last = aMapping;
        this._array.push(aMapping);
      } else {
        this._sorted = false;
        this._array.push(aMapping);
      }
    };
    MappingList.prototype.toArray = function MappingList_toArray() {
      if (!this._sorted) {
        this._array.sort(util.compareByGeneratedPositionsInflated);
        this._sorted = true;
      }
      return this._array;
    };
    exports.MappingList = MappingList;
  }
});

// node_modules/source-map-js/lib/source-map-generator.js
var require_source_map_generator = __commonJS({
  "node_modules/source-map-js/lib/source-map-generator.js"(exports) {
    var base64VLQ = require_base64_vlq();
    var util = require_util();
    var ArraySet = require_array_set().ArraySet;
    var MappingList = require_mapping_list().MappingList;
    function SourceMapGenerator(aArgs) {
      if (!aArgs) {
        aArgs = {};
      }
      this._file = util.getArg(aArgs, "file", null);
      this._sourceRoot = util.getArg(aArgs, "sourceRoot", null);
      this._skipValidation = util.getArg(aArgs, "skipValidation", false);
      this._ignoreInvalidMapping = util.getArg(aArgs, "ignoreInvalidMapping", false);
      this._sources = new ArraySet();
      this._names = new ArraySet();
      this._mappings = new MappingList();
      this._sourcesContents = null;
    }
    SourceMapGenerator.prototype._version = 3;
    SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer, generatorOps) {
      var sourceRoot = aSourceMapConsumer.sourceRoot;
      var generator = new SourceMapGenerator(Object.assign(generatorOps || {}, {
        file: aSourceMapConsumer.file,
        sourceRoot
      }));
      aSourceMapConsumer.eachMapping(function(mapping) {
        var newMapping = {
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          }
        };
        if (mapping.source != null) {
          newMapping.source = mapping.source;
          if (sourceRoot != null) {
            newMapping.source = util.relative(sourceRoot, newMapping.source);
          }
          newMapping.original = {
            line: mapping.originalLine,
            column: mapping.originalColumn
          };
          if (mapping.name != null) {
            newMapping.name = mapping.name;
          }
        }
        generator.addMapping(newMapping);
      });
      aSourceMapConsumer.sources.forEach(function(sourceFile) {
        var sourceRelative = sourceFile;
        if (sourceRoot !== null) {
          sourceRelative = util.relative(sourceRoot, sourceFile);
        }
        if (!generator._sources.has(sourceRelative)) {
          generator._sources.add(sourceRelative);
        }
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          generator.setSourceContent(sourceFile, content);
        }
      });
      return generator;
    };
    SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
      var generated = util.getArg(aArgs, "generated");
      var original = util.getArg(aArgs, "original", null);
      var source = util.getArg(aArgs, "source", null);
      var name = util.getArg(aArgs, "name", null);
      if (!this._skipValidation) {
        if (this._validateMapping(generated, original, source, name) === false) {
          return;
        }
      }
      if (source != null) {
        source = String(source);
        if (!this._sources.has(source)) {
          this._sources.add(source);
        }
      }
      if (name != null) {
        name = String(name);
        if (!this._names.has(name)) {
          this._names.add(name);
        }
      }
      this._mappings.add({
        generatedLine: generated.line,
        generatedColumn: generated.column,
        originalLine: original != null && original.line,
        originalColumn: original != null && original.column,
        source,
        name
      });
    };
    SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
      var source = aSourceFile;
      if (this._sourceRoot != null) {
        source = util.relative(this._sourceRoot, source);
      }
      if (aSourceContent != null) {
        if (!this._sourcesContents) {
          this._sourcesContents = /* @__PURE__ */ Object.create(null);
        }
        this._sourcesContents[util.toSetString(source)] = aSourceContent;
      } else if (this._sourcesContents) {
        delete this._sourcesContents[util.toSetString(source)];
        if (Object.keys(this._sourcesContents).length === 0) {
          this._sourcesContents = null;
        }
      }
    };
    SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
      var sourceFile = aSourceFile;
      if (aSourceFile == null) {
        if (aSourceMapConsumer.file == null) {
          throw new Error(
            `SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, or the source map's "file" property. Both were omitted.`
          );
        }
        sourceFile = aSourceMapConsumer.file;
      }
      var sourceRoot = this._sourceRoot;
      if (sourceRoot != null) {
        sourceFile = util.relative(sourceRoot, sourceFile);
      }
      var newSources = new ArraySet();
      var newNames = new ArraySet();
      this._mappings.unsortedForEach(function(mapping) {
        if (mapping.source === sourceFile && mapping.originalLine != null) {
          var original = aSourceMapConsumer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn
          });
          if (original.source != null) {
            mapping.source = original.source;
            if (aSourceMapPath != null) {
              mapping.source = util.join(aSourceMapPath, mapping.source);
            }
            if (sourceRoot != null) {
              mapping.source = util.relative(sourceRoot, mapping.source);
            }
            mapping.originalLine = original.line;
            mapping.originalColumn = original.column;
            if (original.name != null) {
              mapping.name = original.name;
            }
          }
        }
        var source = mapping.source;
        if (source != null && !newSources.has(source)) {
          newSources.add(source);
        }
        var name = mapping.name;
        if (name != null && !newNames.has(name)) {
          newNames.add(name);
        }
      }, this);
      this._sources = newSources;
      this._names = newNames;
      aSourceMapConsumer.sources.forEach(function(sourceFile2) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile2);
        if (content != null) {
          if (aSourceMapPath != null) {
            sourceFile2 = util.join(aSourceMapPath, sourceFile2);
          }
          if (sourceRoot != null) {
            sourceFile2 = util.relative(sourceRoot, sourceFile2);
          }
          this.setSourceContent(sourceFile2, content);
        }
      }, this);
    };
    SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
      if (aOriginal && typeof aOriginal.line !== "number" && typeof aOriginal.column !== "number") {
        var message = "original.line and original.column are not numbers -- you probably meant to omit the original mapping entirely and only map the generated position. If so, pass null for the original mapping instead of an object with empty or null values.";
        if (this._ignoreInvalidMapping) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn(message);
          }
          return false;
        } else {
          throw new Error(message);
        }
      }
      if (aGenerated && "line" in aGenerated && "column" in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
        return;
      } else if (aGenerated && "line" in aGenerated && "column" in aGenerated && aOriginal && "line" in aOriginal && "column" in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
        return;
      } else {
        var message = "Invalid mapping: " + JSON.stringify({
          generated: aGenerated,
          source: aSource,
          original: aOriginal,
          name: aName
        });
        if (this._ignoreInvalidMapping) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn(message);
          }
          return false;
        } else {
          throw new Error(message);
        }
      }
    };
    SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
      var previousGeneratedColumn = 0;
      var previousGeneratedLine = 1;
      var previousOriginalColumn = 0;
      var previousOriginalLine = 0;
      var previousName = 0;
      var previousSource = 0;
      var result = "";
      var next;
      var mapping;
      var nameIdx;
      var sourceIdx;
      var mappings = this._mappings.toArray();
      for (var i = 0, len = mappings.length; i < len; i++) {
        mapping = mappings[i];
        next = "";
        if (mapping.generatedLine !== previousGeneratedLine) {
          previousGeneratedColumn = 0;
          var lineDelta = mapping.generatedLine - previousGeneratedLine;
          next += lineDelta === 1 ? ";" : ";".repeat(lineDelta);
          previousGeneratedLine = mapping.generatedLine;
        } else {
          if (i > 0) {
            if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
              continue;
            }
            next += ",";
          }
        }
        next += base64VLQ.encode(mapping.generatedColumn - previousGeneratedColumn);
        previousGeneratedColumn = mapping.generatedColumn;
        if (mapping.source != null) {
          sourceIdx = this._sources.indexOf(mapping.source);
          next += base64VLQ.encode(sourceIdx - previousSource);
          previousSource = sourceIdx;
          next += base64VLQ.encode(mapping.originalLine - 1 - previousOriginalLine);
          previousOriginalLine = mapping.originalLine - 1;
          next += base64VLQ.encode(mapping.originalColumn - previousOriginalColumn);
          previousOriginalColumn = mapping.originalColumn;
          if (mapping.name != null) {
            nameIdx = this._names.indexOf(mapping.name);
            next += base64VLQ.encode(nameIdx - previousName);
            previousName = nameIdx;
          }
        }
        result += next;
      }
      return result;
    };
    SourceMapGenerator.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
      return aSources.map(function(source) {
        if (!this._sourcesContents) {
          return null;
        }
        if (aSourceRoot != null) {
          source = util.relative(aSourceRoot, source);
        }
        var key = util.toSetString(source);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
      }, this);
    };
    SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
      var map = {
        version: this._version,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings()
      };
      if (this._file != null) {
        map.file = this._file;
      }
      if (this._sourceRoot != null) {
        map.sourceRoot = this._sourceRoot;
      }
      if (this._sourcesContents) {
        map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
      }
      return map;
    };
    SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
      return JSON.stringify(this.toJSON());
    };
    exports.SourceMapGenerator = SourceMapGenerator;
  }
});

// node_modules/source-map-js/lib/binary-search.js
var require_binary_search = __commonJS({
  "node_modules/source-map-js/lib/binary-search.js"(exports) {
    exports.GREATEST_LOWER_BOUND = 1;
    exports.LEAST_UPPER_BOUND = 2;
    function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
      var mid = Math.floor((aHigh - aLow) / 2) + aLow;
      var cmp = aCompare(aNeedle, aHaystack[mid], true);
      if (cmp === 0) {
        return mid;
      } else if (cmp > 0) {
        if (aHigh - mid > 1) {
          return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
        }
        if (aBias == exports.LEAST_UPPER_BOUND) {
          return aHigh < aHaystack.length ? aHigh : -1;
        } else {
          return mid;
        }
      } else {
        if (mid - aLow > 1) {
          return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
        }
        if (aBias == exports.LEAST_UPPER_BOUND) {
          return mid;
        } else {
          return aLow < 0 ? -1 : aLow;
        }
      }
    }
    exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
      if (aHaystack.length === 0) {
        return -1;
      }
      var index = recursiveSearch(
        -1,
        aHaystack.length,
        aNeedle,
        aHaystack,
        aCompare,
        aBias || exports.GREATEST_LOWER_BOUND
      );
      if (index < 0) {
        return -1;
      }
      while (index - 1 >= 0) {
        if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
          break;
        }
        --index;
      }
      return index;
    };
  }
});

// node_modules/source-map-js/lib/quick-sort.js
var require_quick_sort = __commonJS({
  "node_modules/source-map-js/lib/quick-sort.js"(exports) {
    function SortTemplate(comparator) {
      function swap(ary, x, y) {
        var temp = ary[x];
        ary[x] = ary[y];
        ary[y] = temp;
      }
      function randomIntInRange(low, high) {
        return Math.round(low + Math.random() * (high - low));
      }
      function doQuickSort(ary, comparator2, p, r) {
        if (p < r) {
          var pivotIndex = randomIntInRange(p, r);
          var i = p - 1;
          swap(ary, pivotIndex, r);
          var pivot = ary[r];
          for (var j = p; j < r; j++) {
            if (comparator2(ary[j], pivot, false) <= 0) {
              i += 1;
              swap(ary, i, j);
            }
          }
          swap(ary, i + 1, j);
          var q = i + 1;
          doQuickSort(ary, comparator2, p, q - 1);
          doQuickSort(ary, comparator2, q + 1, r);
        }
      }
      return doQuickSort;
    }
    function cloneSort(comparator) {
      let template = SortTemplate.toString();
      let templateFn = new Function(`return ${template}`)();
      return templateFn(comparator);
    }
    var isEvalAllowed = (function() {
      try {
        new Function("return 0")();
        return true;
      } catch {
        return false;
      }
    })();
    var sortCache = /* @__PURE__ */ new WeakMap();
    exports.quickSort = function(ary, comparator, start = 0) {
      let doQuickSort = isEvalAllowed ? sortCache.get(comparator) : SortTemplate(comparator);
      if (doQuickSort === void 0) {
        doQuickSort = cloneSort(comparator);
        sortCache.set(comparator, doQuickSort);
      }
      doQuickSort(ary, comparator, start, ary.length - 1);
    };
  }
});

// node_modules/source-map-js/lib/source-map-consumer.js
var require_source_map_consumer = __commonJS({
  "node_modules/source-map-js/lib/source-map-consumer.js"(exports) {
    var util = require_util();
    var binarySearch = require_binary_search();
    var ArraySet = require_array_set().ArraySet;
    var base64VLQ = require_base64_vlq();
    var quickSort = require_quick_sort().quickSort;
    var MAX_SECTION_OFFSET_LINE = 1e7;
    function SourceMapConsumer(aSourceMap, aSourceMapURL) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === "string") {
        sourceMap = util.parseSourceMapInput(aSourceMap);
      }
      return sourceMap.sections != null ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL) : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
    }
    SourceMapConsumer.fromSourceMap = function(aSourceMap, aSourceMapURL) {
      return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
    };
    SourceMapConsumer.prototype._version = 3;
    SourceMapConsumer.prototype.__generatedMappings = null;
    Object.defineProperty(SourceMapConsumer.prototype, "_generatedMappings", {
      configurable: true,
      enumerable: true,
      get: function() {
        if (!this.__generatedMappings) {
          this._parseMappings(this._mappings, this.sourceRoot);
        }
        return this.__generatedMappings;
      }
    });
    SourceMapConsumer.prototype.__originalMappings = null;
    Object.defineProperty(SourceMapConsumer.prototype, "_originalMappings", {
      configurable: true,
      enumerable: true,
      get: function() {
        if (!this.__originalMappings) {
          this._parseMappings(this._mappings, this.sourceRoot);
        }
        return this.__originalMappings;
      }
    });
    SourceMapConsumer.prototype._charIsMappingSeparator = function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
      var c = aStr.charAt(index);
      return c === ";" || c === ",";
    };
    SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      throw new Error("Subclasses must implement _parseMappings");
    };
    SourceMapConsumer.GENERATED_ORDER = 1;
    SourceMapConsumer.ORIGINAL_ORDER = 2;
    SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
    SourceMapConsumer.LEAST_UPPER_BOUND = 2;
    SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
      var context2 = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
      var mappings;
      switch (order) {
        case SourceMapConsumer.GENERATED_ORDER:
          mappings = this._generatedMappings;
          break;
        case SourceMapConsumer.ORIGINAL_ORDER:
          mappings = this._originalMappings;
          break;
        default:
          throw new Error("Unknown order of iteration.");
      }
      var sourceRoot = this.sourceRoot;
      var boundCallback = aCallback.bind(context2);
      var names = this._names;
      var sources = this._sources;
      var sourceMapURL = this._sourceMapURL;
      for (var i = 0, n = mappings.length; i < n; i++) {
        var mapping = mappings[i];
        var source = mapping.source === null ? null : sources.at(mapping.source);
        if (source !== null) {
          source = util.computeSourceURL(sourceRoot, source, sourceMapURL);
        }
        boundCallback({
          source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name === null ? null : names.at(mapping.name)
        });
      }
    };
    SourceMapConsumer.prototype.allGeneratedPositionsFor = function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
      var line = util.getArg(aArgs, "line");
      var needle = {
        source: util.getArg(aArgs, "source"),
        originalLine: line,
        originalColumn: util.getArg(aArgs, "column", 0)
      };
      needle.source = this._findSourceIndex(needle.source);
      if (needle.source < 0) {
        return [];
      }
      var mappings = [];
      var index = this._findMapping(
        needle,
        this._originalMappings,
        "originalLine",
        "originalColumn",
        util.compareByOriginalPositions,
        binarySearch.LEAST_UPPER_BOUND
      );
      if (index >= 0) {
        var mapping = this._originalMappings[index];
        if (aArgs.column === void 0) {
          var originalLine = mapping.originalLine;
          while (mapping && mapping.originalLine === originalLine) {
            mappings.push({
              line: util.getArg(mapping, "generatedLine", null),
              column: util.getArg(mapping, "generatedColumn", null),
              lastColumn: util.getArg(mapping, "lastGeneratedColumn", null)
            });
            mapping = this._originalMappings[++index];
          }
        } else {
          var originalColumn = mapping.originalColumn;
          while (mapping && mapping.originalLine === line && mapping.originalColumn == originalColumn) {
            mappings.push({
              line: util.getArg(mapping, "generatedLine", null),
              column: util.getArg(mapping, "generatedColumn", null),
              lastColumn: util.getArg(mapping, "lastGeneratedColumn", null)
            });
            mapping = this._originalMappings[++index];
          }
        }
      }
      return mappings;
    };
    exports.SourceMapConsumer = SourceMapConsumer;
    function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === "string") {
        sourceMap = util.parseSourceMapInput(aSourceMap);
      }
      var version = util.getArg(sourceMap, "version");
      var sources = util.getArg(sourceMap, "sources");
      var names = util.getArg(sourceMap, "names", []);
      var sourceRoot = util.getArg(sourceMap, "sourceRoot", null);
      var sourcesContent = util.getArg(sourceMap, "sourcesContent", null);
      var mappings = util.getArg(sourceMap, "mappings");
      var file = util.getArg(sourceMap, "file", null);
      if (version != this._version) {
        throw new Error("Unsupported version: " + version);
      }
      if (sourceRoot) {
        sourceRoot = util.normalize(sourceRoot);
      }
      sources = sources.map(String).map(util.normalize).map(function(source) {
        return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source) ? util.relative(sourceRoot, source) : source;
      });
      this._names = ArraySet.fromArray(names.map(String), true);
      this._sources = ArraySet.fromArray(sources, true);
      this._absoluteSources = this._sources.toArray().map(function(s) {
        return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
      });
      this.sourceRoot = sourceRoot;
      this.sourcesContent = sourcesContent;
      this._mappings = mappings;
      this._sourceMapURL = aSourceMapURL;
      this.file = file;
    }
    BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
    BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;
    BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
      var relativeSource = aSource;
      if (this.sourceRoot != null) {
        relativeSource = util.relative(this.sourceRoot, relativeSource);
      }
      if (this._sources.has(relativeSource)) {
        return this._sources.indexOf(relativeSource);
      }
      var i;
      for (i = 0; i < this._absoluteSources.length; ++i) {
        if (this._absoluteSources[i] == aSource) {
          return i;
        }
      }
      return -1;
    };
    BasicSourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
      var smc = Object.create(BasicSourceMapConsumer.prototype);
      var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
      var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
      smc.sourceRoot = aSourceMap._sourceRoot;
      smc.sourcesContent = aSourceMap._generateSourcesContent(
        smc._sources.toArray(),
        smc.sourceRoot
      );
      smc.file = aSourceMap._file;
      smc._sourceMapURL = aSourceMapURL;
      smc._absoluteSources = smc._sources.toArray().map(function(s) {
        return util.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
      });
      var generatedMappings = aSourceMap._mappings.toArray().slice();
      var destGeneratedMappings = smc.__generatedMappings = [];
      var destOriginalMappings = smc.__originalMappings = [];
      for (var i = 0, length = generatedMappings.length; i < length; i++) {
        var srcMapping = generatedMappings[i];
        var destMapping = new Mapping();
        destMapping.generatedLine = srcMapping.generatedLine;
        destMapping.generatedColumn = srcMapping.generatedColumn;
        if (srcMapping.source) {
          destMapping.source = sources.indexOf(srcMapping.source);
          destMapping.originalLine = srcMapping.originalLine;
          destMapping.originalColumn = srcMapping.originalColumn;
          if (srcMapping.name) {
            destMapping.name = names.indexOf(srcMapping.name);
          }
          destOriginalMappings.push(destMapping);
        }
        destGeneratedMappings.push(destMapping);
      }
      quickSort(smc.__originalMappings, util.compareByOriginalPositions);
      return smc;
    };
    BasicSourceMapConsumer.prototype._version = 3;
    Object.defineProperty(BasicSourceMapConsumer.prototype, "sources", {
      get: function() {
        return this._absoluteSources.slice();
      }
    });
    function Mapping() {
      this.generatedLine = 0;
      this.generatedColumn = 0;
      this.source = null;
      this.originalLine = null;
      this.originalColumn = null;
      this.name = null;
    }
    var compareGenerated = util.compareByGeneratedPositionsDeflatedNoLine;
    function sortGenerated(array, start) {
      let l = array.length;
      let n = array.length - start;
      if (n <= 1) {
        return;
      } else if (n == 2) {
        let a = array[start];
        let b = array[start + 1];
        if (compareGenerated(a, b) > 0) {
          array[start] = b;
          array[start + 1] = a;
        }
      } else if (n < 20) {
        for (let i = start; i < l; i++) {
          for (let j = i; j > start; j--) {
            let a = array[j - 1];
            let b = array[j];
            if (compareGenerated(a, b) <= 0) {
              break;
            }
            array[j - 1] = b;
            array[j] = a;
          }
        }
      } else {
        quickSort(array, compareGenerated, start);
      }
    }
    BasicSourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      var generatedLine = 1;
      var previousGeneratedColumn = 0;
      var previousOriginalLine = 0;
      var previousOriginalColumn = 0;
      var previousSource = 0;
      var previousName = 0;
      var length = aStr.length;
      var index = 0;
      var cachedSegments = {};
      var temp = {};
      var originalMappings = [];
      var generatedMappings = [];
      var mapping, str, segment, end, value;
      let subarrayStart = 0;
      while (index < length) {
        if (aStr.charAt(index) === ";") {
          generatedLine++;
          index++;
          previousGeneratedColumn = 0;
          sortGenerated(generatedMappings, subarrayStart);
          subarrayStart = generatedMappings.length;
        } else if (aStr.charAt(index) === ",") {
          index++;
        } else {
          mapping = new Mapping();
          mapping.generatedLine = generatedLine;
          for (end = index; end < length; end++) {
            if (this._charIsMappingSeparator(aStr, end)) {
              break;
            }
          }
          str = aStr.slice(index, end);
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }
          if (segment.length === 2) {
            throw new Error("Found a source, but no line and column");
          }
          if (segment.length === 3) {
            throw new Error("Found a source and line, but no column");
          }
          mapping.generatedColumn = previousGeneratedColumn + segment[0];
          previousGeneratedColumn = mapping.generatedColumn;
          if (segment.length > 1) {
            mapping.source = previousSource + segment[1];
            previousSource += segment[1];
            mapping.originalLine = previousOriginalLine + segment[2];
            previousOriginalLine = mapping.originalLine;
            mapping.originalLine += 1;
            mapping.originalColumn = previousOriginalColumn + segment[3];
            previousOriginalColumn = mapping.originalColumn;
            if (segment.length > 4) {
              mapping.name = previousName + segment[4];
              previousName += segment[4];
            }
          }
          generatedMappings.push(mapping);
          if (typeof mapping.originalLine === "number") {
            let currentSource = mapping.source;
            while (originalMappings.length <= currentSource) {
              originalMappings.push(null);
            }
            if (originalMappings[currentSource] === null) {
              originalMappings[currentSource] = [];
            }
            originalMappings[currentSource].push(mapping);
          }
        }
      }
      sortGenerated(generatedMappings, subarrayStart);
      this.__generatedMappings = generatedMappings;
      for (var i = 0; i < originalMappings.length; i++) {
        if (originalMappings[i] != null) {
          quickSort(originalMappings[i], util.compareByOriginalPositionsNoSource);
        }
      }
      this.__originalMappings = [].concat(...originalMappings);
    };
    BasicSourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator, aBias) {
      if (aNeedle[aLineName] <= 0) {
        throw new TypeError("Line must be greater than or equal to 1, got " + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError("Column must be greater than or equal to 0, got " + aNeedle[aColumnName]);
      }
      return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
    };
    BasicSourceMapConsumer.prototype.computeColumnSpans = function SourceMapConsumer_computeColumnSpans() {
      for (var index = 0; index < this._generatedMappings.length; ++index) {
        var mapping = this._generatedMappings[index];
        if (index + 1 < this._generatedMappings.length) {
          var nextMapping = this._generatedMappings[index + 1];
          if (mapping.generatedLine === nextMapping.generatedLine) {
            mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
            continue;
          }
        }
        mapping.lastGeneratedColumn = Infinity;
      }
    };
    BasicSourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, "line"),
        generatedColumn: util.getArg(aArgs, "column")
      };
      var index = this._findMapping(
        needle,
        this._generatedMappings,
        "generatedLine",
        "generatedColumn",
        util.compareByGeneratedPositionsDeflated,
        util.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND)
      );
      if (index >= 0) {
        var mapping = this._generatedMappings[index];
        if (mapping.generatedLine === needle.generatedLine) {
          var source = util.getArg(mapping, "source", null);
          if (source !== null) {
            source = this._sources.at(source);
            source = util.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
          }
          var name = util.getArg(mapping, "name", null);
          if (name !== null) {
            name = this._names.at(name);
          }
          return {
            source,
            line: util.getArg(mapping, "originalLine", null),
            column: util.getArg(mapping, "originalColumn", null),
            name
          };
        }
      }
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };
    BasicSourceMapConsumer.prototype.hasContentsOfAllSources = function BasicSourceMapConsumer_hasContentsOfAllSources() {
      if (!this.sourcesContent) {
        return false;
      }
      return this.sourcesContent.length >= this._sources.size() && !this.sourcesContent.some(function(sc) {
        return sc == null;
      });
    };
    BasicSourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      if (!this.sourcesContent) {
        return null;
      }
      var index = this._findSourceIndex(aSource);
      if (index >= 0) {
        return this.sourcesContent[index];
      }
      var relativeSource = aSource;
      if (this.sourceRoot != null) {
        relativeSource = util.relative(this.sourceRoot, relativeSource);
      }
      var url;
      if (this.sourceRoot != null && (url = util.urlParse(this.sourceRoot))) {
        var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
        if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
        }
        if ((!url.path || url.path == "/") && this._sources.has("/" + relativeSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
        }
      }
      if (nullOnMissing) {
        return null;
      } else {
        throw new Error('"' + relativeSource + '" is not in the SourceMap.');
      }
    };
    BasicSourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
      var source = util.getArg(aArgs, "source");
      source = this._findSourceIndex(source);
      if (source < 0) {
        return {
          line: null,
          column: null,
          lastColumn: null
        };
      }
      var needle = {
        source,
        originalLine: util.getArg(aArgs, "line"),
        originalColumn: util.getArg(aArgs, "column")
      };
      var index = this._findMapping(
        needle,
        this._originalMappings,
        "originalLine",
        "originalColumn",
        util.compareByOriginalPositions,
        util.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND)
      );
      if (index >= 0) {
        var mapping = this._originalMappings[index];
        if (mapping.source === needle.source) {
          return {
            line: util.getArg(mapping, "generatedLine", null),
            column: util.getArg(mapping, "generatedColumn", null),
            lastColumn: util.getArg(mapping, "lastGeneratedColumn", null)
          };
        }
      }
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    };
    exports.BasicSourceMapConsumer = BasicSourceMapConsumer;
    function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === "string") {
        sourceMap = util.parseSourceMapInput(aSourceMap);
      }
      var version = util.getArg(sourceMap, "version");
      var sections = util.getArg(sourceMap, "sections");
      if (version != this._version) {
        throw new Error("Unsupported version: " + version);
      }
      this._sources = new ArraySet();
      this._names = new ArraySet();
      var lastOffset = {
        line: -1,
        column: 0
      };
      var maxOffsetLine = 0;
      this._sections = sections.map(function(s) {
        if (s.url) {
          throw new Error("Support for url field in sections not implemented.");
        }
        var offset = util.getArg(s, "offset");
        var offsetLine = util.getArg(offset, "line");
        var offsetColumn = util.getArg(offset, "column");
        if (!isValidOffset(offsetLine) || !isValidOffset(offsetColumn)) {
          throw new Error("Section offset line and column must be non-negative integers.");
        }
        if (offsetLine > MAX_SECTION_OFFSET_LINE) {
          throw new Error("Section offset line must not exceed " + MAX_SECTION_OFFSET_LINE + ".");
        }
        if (offsetLine < lastOffset.line || offsetLine === lastOffset.line && offsetColumn < lastOffset.column) {
          throw new Error("Section offsets must be ordered and non-overlapping.");
        }
        lastOffset = offset;
        var consumer = new SourceMapConsumer(util.getArg(s, "map"), aSourceMapURL);
        var totalOffsetLine = offsetLine + (consumer._maxOffsetLine || 0);
        if (totalOffsetLine > MAX_SECTION_OFFSET_LINE) {
          throw new Error("Section offset line must not exceed " + MAX_SECTION_OFFSET_LINE + ", including offsets of nested sections.");
        }
        if (totalOffsetLine > maxOffsetLine) {
          maxOffsetLine = totalOffsetLine;
        }
        return {
          generatedOffset: {
            // The offset fields are 0-based, but we use 1-based indices when
            // encoding/decoding from VLQ.
            generatedLine: offsetLine + 1,
            generatedColumn: offsetColumn + 1
          },
          consumer
        };
      });
      this._maxOffsetLine = maxOffsetLine;
    }
    function isValidOffset(aValue) {
      return typeof aValue === "number" && aValue >= 0 && aValue <= 9007199254740991 && // Number.MAX_SAFE_INTEGER
      Math.floor(aValue) === aValue;
    }
    IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
    IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;
    IndexedSourceMapConsumer.prototype._version = 3;
    Object.defineProperty(IndexedSourceMapConsumer.prototype, "sources", {
      get: function() {
        var sources = [];
        for (var i = 0; i < this._sections.length; i++) {
          var sectionSources = this._sections[i].consumer.sources;
          for (var j = 0; j < sectionSources.length; j++) {
            sources.push(sectionSources[j]);
          }
        }
        return sources;
      }
    });
    IndexedSourceMapConsumer.prototype.originalPositionFor = function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, "line"),
        generatedColumn: util.getArg(aArgs, "column")
      };
      var sectionIndex = binarySearch.search(
        needle,
        this._sections,
        function(needle2, section2) {
          var cmp = needle2.generatedLine - section2.generatedOffset.generatedLine;
          if (cmp) {
            return cmp;
          }
          return needle2.generatedColumn - section2.generatedOffset.generatedColumn;
        }
      );
      var section = this._sections[sectionIndex];
      if (!section) {
        return {
          source: null,
          line: null,
          column: null,
          name: null
        };
      }
      return section.consumer.originalPositionFor({
        line: needle.generatedLine - (section.generatedOffset.generatedLine - 1),
        column: needle.generatedColumn - (section.generatedOffset.generatedLine === needle.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
        bias: aArgs.bias
      });
    };
    IndexedSourceMapConsumer.prototype.hasContentsOfAllSources = function IndexedSourceMapConsumer_hasContentsOfAllSources() {
      return this._sections.every(function(s) {
        return s.consumer.hasContentsOfAllSources();
      });
    };
    IndexedSourceMapConsumer.prototype.sourceContentFor = function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        var content = section.consumer.sourceContentFor(aSource, true);
        if (content || content === "") {
          return content;
        }
      }
      if (nullOnMissing) {
        return null;
      } else {
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      }
    };
    IndexedSourceMapConsumer.prototype.generatedPositionFor = function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        if (section.consumer._findSourceIndex(util.getArg(aArgs, "source")) === -1) {
          continue;
        }
        var generatedPosition = section.consumer.generatedPositionFor(aArgs);
        if (generatedPosition) {
          var ret = {
            line: generatedPosition.line + (section.generatedOffset.generatedLine - 1),
            column: generatedPosition.column + (section.generatedOffset.generatedLine === generatedPosition.line ? section.generatedOffset.generatedColumn - 1 : 0)
          };
          return ret;
        }
      }
      return {
        line: null,
        column: null
      };
    };
    IndexedSourceMapConsumer.prototype._parseMappings = function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      this.__generatedMappings = [];
      this.__originalMappings = [];
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        var sectionMappings = section.consumer._generatedMappings;
        for (var j = 0; j < sectionMappings.length; j++) {
          var mapping = sectionMappings[j];
          var source = section.consumer._sources.at(mapping.source);
          if (source !== null) {
            source = util.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
          }
          this._sources.add(source);
          source = this._sources.indexOf(source);
          var name = null;
          if (mapping.name) {
            name = section.consumer._names.at(mapping.name);
            this._names.add(name);
            name = this._names.indexOf(name);
          }
          var adjustedMapping = {
            source,
            generatedLine: mapping.generatedLine + (section.generatedOffset.generatedLine - 1),
            generatedColumn: mapping.generatedColumn + (section.generatedOffset.generatedLine === mapping.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            name
          };
          this.__generatedMappings.push(adjustedMapping);
          if (typeof adjustedMapping.originalLine === "number") {
            this.__originalMappings.push(adjustedMapping);
          }
        }
      }
      quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
      quickSort(this.__originalMappings, util.compareByOriginalPositions);
    };
    exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
  }
});

// node_modules/source-map-js/lib/source-node.js
var require_source_node = __commonJS({
  "node_modules/source-map-js/lib/source-node.js"(exports) {
    var SourceMapGenerator = require_source_map_generator().SourceMapGenerator;
    var util = require_util();
    var REGEX_NEWLINE = /(\r?\n)/;
    var NEWLINE_CODE = 10;
    var isSourceNode = "$$$isSourceNode$$$";
    function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
      this.children = [];
      this.sourceContents = {};
      this.line = aLine == null ? null : aLine;
      this.column = aColumn == null ? null : aColumn;
      this.source = aSource == null ? null : aSource;
      this.name = aName == null ? null : aName;
      this[isSourceNode] = true;
      if (aChunks != null) this.add(aChunks);
    }
    SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
      var node = new SourceNode();
      var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
      var remainingLinesIndex = 0;
      var shiftNextLine = function() {
        var lineContents = getNextLine();
        var newLine = getNextLine() || "";
        return lineContents + newLine;
        function getNextLine() {
          return remainingLinesIndex < remainingLines.length ? remainingLines[remainingLinesIndex++] : void 0;
        }
      };
      var lastGeneratedLine = 1, lastGeneratedColumn = 0;
      var lastMapping = null;
      aSourceMapConsumer.eachMapping(function(mapping) {
        if (lastMapping !== null) {
          if (lastGeneratedLine < mapping.generatedLine) {
            addMappingWithCode(lastMapping, shiftNextLine());
            lastGeneratedLine++;
            lastGeneratedColumn = 0;
          } else {
            var nextLine = remainingLines[remainingLinesIndex] || "";
            var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
            remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
            addMappingWithCode(lastMapping, code);
            lastMapping = mapping;
            return;
          }
        }
        while (lastGeneratedLine < mapping.generatedLine) {
          if (remainingLinesIndex >= remainingLines.length) {
            lastGeneratedLine = mapping.generatedLine;
            break;
          }
          node.add(shiftNextLine());
          lastGeneratedLine++;
        }
        if (lastGeneratedColumn < mapping.generatedColumn) {
          var nextLine = remainingLines[remainingLinesIndex] || "";
          node.add(nextLine.substr(0, mapping.generatedColumn));
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
        }
        lastMapping = mapping;
      }, this);
      if (remainingLinesIndex < remainingLines.length) {
        if (lastMapping) {
          addMappingWithCode(lastMapping, shiftNextLine());
        }
        node.add(remainingLines.splice(remainingLinesIndex).join(""));
      }
      aSourceMapConsumer.sources.forEach(function(sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aRelativePath != null) {
            sourceFile = util.join(aRelativePath, sourceFile);
          }
          node.setSourceContent(sourceFile, content);
        }
      });
      return node;
      function addMappingWithCode(mapping, code) {
        if (mapping === null || mapping.source === void 0) {
          node.add(code);
        } else {
          var source = aRelativePath ? util.join(aRelativePath, mapping.source) : mapping.source;
          node.add(new SourceNode(
            mapping.originalLine,
            mapping.originalColumn,
            source,
            code,
            mapping.name
          ));
        }
      }
    };
    SourceNode.prototype.add = function SourceNode_add(aChunk) {
      if (Array.isArray(aChunk)) {
        aChunk.forEach(function(chunk) {
          this.add(chunk);
        }, this);
      } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
        if (aChunk) {
          this.children.push(aChunk);
        }
      } else {
        throw new TypeError(
          "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
        );
      }
      return this;
    };
    SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
      if (Array.isArray(aChunk)) {
        for (var i = aChunk.length - 1; i >= 0; i--) {
          this.prepend(aChunk[i]);
        }
      } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
        this.children.unshift(aChunk);
      } else {
        throw new TypeError(
          "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
        );
      }
      return this;
    };
    SourceNode.prototype.walk = function SourceNode_walk(aFn) {
      var chunk;
      for (var i = 0, len = this.children.length; i < len; i++) {
        chunk = this.children[i];
        if (chunk[isSourceNode]) {
          chunk.walk(aFn);
        } else {
          if (chunk !== "") {
            aFn(chunk, {
              source: this.source,
              line: this.line,
              column: this.column,
              name: this.name
            });
          }
        }
      }
    };
    SourceNode.prototype.join = function SourceNode_join(aSep) {
      var newChildren;
      var i;
      var len = this.children.length;
      if (len > 0) {
        newChildren = [];
        for (i = 0; i < len - 1; i++) {
          newChildren.push(this.children[i]);
          newChildren.push(aSep);
        }
        newChildren.push(this.children[i]);
        this.children = newChildren;
      }
      return this;
    };
    SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
      var lastChild = this.children[this.children.length - 1];
      if (lastChild[isSourceNode]) {
        lastChild.replaceRight(aPattern, aReplacement);
      } else if (typeof lastChild === "string") {
        this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
      } else {
        this.children.push("".replace(aPattern, aReplacement));
      }
      return this;
    };
    SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
      this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    };
    SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
      for (var i = 0, len = this.children.length; i < len; i++) {
        if (this.children[i][isSourceNode]) {
          this.children[i].walkSourceContents(aFn);
        }
      }
      var sources = Object.keys(this.sourceContents);
      for (var i = 0, len = sources.length; i < len; i++) {
        aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
      }
    };
    SourceNode.prototype.toString = function SourceNode_toString() {
      var str = "";
      this.walk(function(chunk) {
        str += chunk;
      });
      return str;
    };
    SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
      var generated = {
        code: "",
        line: 1,
        column: 0
      };
      var map = new SourceMapGenerator(aArgs);
      var sourceMappingActive = false;
      var lastOriginalSource = null;
      var lastOriginalLine = null;
      var lastOriginalColumn = null;
      var lastOriginalName = null;
      this.walk(function(chunk, original) {
        generated.code += chunk;
        if (original.source !== null && original.line !== null && original.column !== null) {
          if (lastOriginalSource !== original.source || lastOriginalLine !== original.line || lastOriginalColumn !== original.column || lastOriginalName !== original.name) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
          lastOriginalSource = original.source;
          lastOriginalLine = original.line;
          lastOriginalColumn = original.column;
          lastOriginalName = original.name;
          sourceMappingActive = true;
        } else if (sourceMappingActive) {
          map.addMapping({
            generated: {
              line: generated.line,
              column: generated.column
            }
          });
          lastOriginalSource = null;
          sourceMappingActive = false;
        }
        for (var idx = 0, length = chunk.length; idx < length; idx++) {
          if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
            generated.line++;
            generated.column = 0;
            if (idx + 1 === length) {
              lastOriginalSource = null;
              sourceMappingActive = false;
            } else if (sourceMappingActive) {
              map.addMapping({
                source: original.source,
                original: {
                  line: original.line,
                  column: original.column
                },
                generated: {
                  line: generated.line,
                  column: generated.column
                },
                name: original.name
              });
            }
          } else {
            generated.column++;
          }
        }
      });
      this.walkSourceContents(function(sourceFile, sourceContent) {
        map.setSourceContent(sourceFile, sourceContent);
      });
      return { code: generated.code, map };
    };
    exports.SourceNode = SourceNode;
  }
});

// node_modules/source-map-js/source-map.js
var require_source_map = __commonJS({
  "node_modules/source-map-js/source-map.js"(exports) {
    exports.SourceMapGenerator = require_source_map_generator().SourceMapGenerator;
    exports.SourceMapConsumer = require_source_map_consumer().SourceMapConsumer;
    exports.SourceNode = require_source_node().SourceNode;
  }
});

// node_modules/postcss/lib/previous-map.js
var require_previous_map = __commonJS({
  "node_modules/postcss/lib/previous-map.js"(exports, module) {
    "use strict";
    var { existsSync, readFileSync, realpathSync } = __require("fs");
    var { dirname, isAbsolute, join, relative, sep } = __require("path");
    var { SourceMapConsumer, SourceMapGenerator } = require_source_map();
    function realPath(path5) {
      try {
        return realpathSync(path5);
      } catch {
        return path5;
      }
    }
    function fromBase64(str) {
      if (Buffer) {
        return Buffer.from(str, "base64").toString();
      } else {
        return window.atob(str);
      }
    }
    var PreviousMap = class {
      constructor(css, opts) {
        if (opts.map === false) return;
        if (opts.unsafeMap) this.unsafeMap = true;
        this.loadAnnotation(css);
        this.inline = this.startWith(this.annotation, "data:");
        let prev = opts.map ? opts.map.prev : void 0;
        let text = this.loadMap(opts.from, prev);
        if (!this.mapFile && opts.from) {
          this.mapFile = opts.from;
        }
        if (this.mapFile) this.root = dirname(this.mapFile);
        if (text) this.text = text;
      }
      consumer() {
        if (!this.consumerCache) {
          this.consumerCache = new SourceMapConsumer(this.json || this.text);
        }
        return this.consumerCache;
      }
      decodeInline(text) {
        let baseCharsetUri = /^data:application\/json;charset=utf-?8;base64,/;
        let baseUri = /^data:application\/json;base64,/;
        let charsetUri = /^data:application\/json;charset=utf-?8,/;
        let uri = /^data:application\/json,/;
        let uriMatch = text.match(charsetUri) || text.match(uri);
        if (uriMatch) {
          return decodeURIComponent(text.substr(uriMatch[0].length));
        }
        let baseUriMatch = text.match(baseCharsetUri) || text.match(baseUri);
        if (baseUriMatch) {
          return fromBase64(text.substr(baseUriMatch[0].length));
        }
        let encoding = text.slice("data:application/json;".length);
        encoding = encoding.slice(0, encoding.indexOf(","));
        throw new Error("Unsupported source map encoding " + encoding);
      }
      getAnnotationURL(sourceMapString) {
        return sourceMapString.replace(/^\/\*\s*# sourceMappingURL=/, "").trim();
      }
      isMap(map) {
        if (typeof map !== "object") return false;
        return typeof map.mappings === "string" || typeof map._mappings === "string" || Array.isArray(map.sections);
      }
      loadAnnotation(css) {
        let comments = css.match(/\/\*\s*# sourceMappingURL=/g);
        if (!comments) return;
        let start = css.lastIndexOf(comments.pop());
        let end = css.indexOf("*/", start);
        if (start > -1 && end > -1) {
          this.annotation = this.getAnnotationURL(css.substring(start, end));
        }
      }
      loadFile(path5, cssFile, trusted) {
        if (!trusted && !this.unsafeMap) {
          if (!/\.map$/i.test(path5)) return void 0;
          if (!cssFile) return void 0;
          let rel = relative(realPath(dirname(cssFile)), realPath(path5));
          if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) {
            return void 0;
          }
        }
        this.root = dirname(path5);
        if (existsSync(path5)) {
          this.mapFile = path5;
          return readFileSync(path5, "utf-8").toString().trim();
        }
      }
      loadMap(file, prev) {
        if (prev === false) return false;
        if (prev) {
          if (typeof prev === "string") {
            return prev;
          } else if (typeof prev === "function") {
            let prevPath = prev(file);
            if (prevPath) {
              let map = this.loadFile(prevPath, file, true);
              if (!map) {
                throw new Error(
                  "Unable to load previous source map: " + prevPath.toString()
                );
              }
              return map;
            }
          } else if (prev instanceof SourceMapConsumer) {
            return SourceMapGenerator.fromSourceMap(prev).toString();
          } else if (prev instanceof SourceMapGenerator) {
            return prev.toString();
          } else if (this.isMap(prev)) {
            return JSON.stringify(prev);
          } else {
            throw new Error(
              "Unsupported previous source map format: " + prev.toString()
            );
          }
        } else if (this.inline) {
          return this.decodeInline(this.annotation);
        } else if (this.annotation) {
          let map = this.annotation;
          if (file) map = join(dirname(file), map);
          let unknown = this.loadFile(map, file, false);
          if (unknown) {
            try {
              this.json = JSON.parse(unknown.replace(/^\)]}'[^\n]*\n/, ""));
            } catch {
              return void 0;
            }
          }
          return unknown;
        }
      }
      startWith(string, start) {
        if (!string) return false;
        return string.substr(0, start.length) === start;
      }
      withContent() {
        return !!(this.consumer().sourcesContent && this.consumer().sourcesContent.length > 0);
      }
    };
    module.exports = PreviousMap;
    PreviousMap.default = PreviousMap;
  }
});

// node_modules/postcss/lib/input.js
var require_input = __commonJS({
  "node_modules/postcss/lib/input.js"(exports, module) {
    "use strict";
    var { nanoid } = require_non_secure();
    var { isAbsolute, resolve } = __require("path");
    var { SourceMapConsumer, SourceMapGenerator } = require_source_map();
    var { fileURLToPath: fileURLToPath2, pathToFileURL } = __require("url");
    var CssSyntaxError = require_css_syntax_error();
    var PreviousMap = require_previous_map();
    var terminalHighlight = require_terminal_highlight();
    var lineToIndexCache = /* @__PURE__ */ Symbol("lineToIndexCache");
    var sourceMapAvailable = Boolean(SourceMapConsumer && SourceMapGenerator);
    var pathAvailable = Boolean(resolve && isAbsolute);
    function getLineToIndex(input) {
      if (input[lineToIndexCache]) return input[lineToIndexCache];
      let lines = input.css.split("\n");
      let lineToIndex = new Array(lines.length);
      let prevIndex = 0;
      for (let i = 0, l = lines.length; i < l; i++) {
        lineToIndex[i] = prevIndex;
        prevIndex += lines[i].length + 1;
      }
      input[lineToIndexCache] = lineToIndex;
      return lineToIndex;
    }
    var Input = class {
      get from() {
        return this.file || this.id;
      }
      constructor(css, opts = {}) {
        if (css === null || typeof css === "undefined" || typeof css === "object" && !css.toString) {
          throw new Error(`PostCSS received ${css} instead of CSS string`);
        }
        this.css = css.toString();
        if (this.css[0] === "\uFEFF" || this.css[0] === "\uFFFE") {
          this.hasBOM = true;
          this.css = this.css.slice(1);
        } else {
          this.hasBOM = false;
        }
        this.document = this.css;
        if (opts.document) this.document = opts.document.toString();
        if (opts.from) {
          if (!pathAvailable || /^\w+:\/\//.test(opts.from) || isAbsolute(opts.from)) {
            this.file = opts.from;
          } else {
            this.file = resolve(opts.from);
          }
        }
        if (pathAvailable && sourceMapAvailable) {
          let map = new PreviousMap(this.css, opts);
          if (map.text) {
            this.map = map;
            let file = map.consumer().file;
            if (!this.file && file) this.file = this.mapResolve(file);
          }
        }
        if (!this.file) {
          this.id = "<input css " + nanoid(6) + ">";
        }
        if (this.map) this.map.file = this.from;
      }
      error(message, line, column, opts = {}) {
        let endColumn, endLine, endOffset, offset, result;
        if (line && typeof line === "object") {
          let start = line;
          let end = column;
          if (typeof start.offset === "number") {
            offset = start.offset;
            let pos = this.fromOffset(offset);
            line = pos.line;
            column = pos.col;
          } else {
            line = start.line;
            column = start.column;
            offset = this.fromLineAndColumn(line, column);
          }
          if (typeof end.offset === "number") {
            endOffset = end.offset;
            let pos = this.fromOffset(endOffset);
            endLine = pos.line;
            endColumn = pos.col;
          } else {
            endLine = end.line;
            endColumn = end.column;
            endOffset = this.fromLineAndColumn(end.line, end.column);
          }
        } else if (!column) {
          offset = line;
          let pos = this.fromOffset(offset);
          line = pos.line;
          column = pos.col;
        } else {
          offset = this.fromLineAndColumn(line, column);
        }
        let origin = this.origin(line, column, endLine, endColumn);
        if (origin) {
          result = new CssSyntaxError(
            message,
            origin.endLine === void 0 ? origin.line : { column: origin.column, line: origin.line },
            origin.endLine === void 0 ? origin.column : { column: origin.endColumn, line: origin.endLine },
            origin.source,
            origin.file,
            opts.plugin
          );
        } else {
          result = new CssSyntaxError(
            message,
            endLine === void 0 ? line : { column, line },
            endLine === void 0 ? column : { column: endColumn, line: endLine },
            this.css,
            this.file,
            opts.plugin
          );
        }
        result.input = {
          column,
          endColumn,
          endLine,
          endOffset,
          line,
          offset,
          source: this.css
        };
        if (this.file) {
          if (pathToFileURL) {
            result.input.url = pathToFileURL(this.file).toString();
          }
          result.input.file = this.file;
        }
        return result;
      }
      fromLineAndColumn(line, column) {
        let lineToIndex = getLineToIndex(this);
        let index = lineToIndex[line - 1];
        return index + column - 1;
      }
      fromOffset(offset) {
        let lineToIndex = getLineToIndex(this);
        let lastLine = lineToIndex[lineToIndex.length - 1];
        let min = 0;
        if (offset >= lastLine) {
          min = lineToIndex.length - 1;
        } else {
          let max = lineToIndex.length - 2;
          let mid;
          while (min < max) {
            mid = min + (max - min >> 1);
            if (offset < lineToIndex[mid]) {
              max = mid - 1;
            } else if (offset >= lineToIndex[mid + 1]) {
              min = mid + 1;
            } else {
              min = mid;
              break;
            }
          }
        }
        return {
          col: offset - lineToIndex[min] + 1,
          line: min + 1
        };
      }
      mapResolve(file) {
        if (/^\w+:\/\//.test(file)) {
          return file;
        }
        return resolve(this.map.consumer().sourceRoot || this.map.root || ".", file);
      }
      origin(line, column, endLine, endColumn) {
        if (!this.map) return false;
        let consumer = this.map.consumer();
        let from = consumer.originalPositionFor({ column: column - 1, line });
        if (!from.source) return false;
        let to;
        if (typeof endLine === "number") {
          let toPosition = consumer.originalPositionFor({
            column: endColumn - 1,
            line: endLine
          });
          if (toPosition.source) to = toPosition;
        }
        let fromUrl;
        if (isAbsolute(from.source)) {
          fromUrl = pathToFileURL(from.source);
        } else {
          fromUrl = new URL(
            from.source,
            pathToFileURL(this.map.mapFile || resolve(".") + "/")
          );
        }
        let result = {
          column: from.column + 1,
          endColumn: to && to.column + 1,
          endLine: to && to.line,
          line: from.line,
          url: fromUrl.toString()
        };
        if (fromUrl.protocol === "file:") {
          if (fileURLToPath2) {
            result.file = fileURLToPath2(fromUrl);
          } else {
            throw new Error(`file: protocol is not available in this PostCSS build`);
          }
        }
        let source = consumer.sourceContentFor(from.source);
        if (source) result.source = source;
        return result;
      }
      toJSON() {
        let json = {};
        for (let name of ["hasBOM", "css", "file", "id"]) {
          if (this[name] != null) {
            json[name] = this[name];
          }
        }
        if (this.map) {
          json.map = { ...this.map };
          if (json.map.consumerCache) {
            json.map.consumerCache = void 0;
          }
        }
        return json;
      }
    };
    module.exports = Input;
    Input.default = Input;
    if (terminalHighlight && terminalHighlight.registerInput) {
      terminalHighlight.registerInput(Input);
    }
  }
});

// node_modules/postcss/lib/root.js
var require_root = __commonJS({
  "node_modules/postcss/lib/root.js"(exports, module) {
    "use strict";
    var Container = require_container();
    var LazyResult;
    var Processor;
    var Root2 = class extends Container {
      constructor(defaults) {
        super(defaults);
        this.type = "root";
        if (!this.nodes) this.nodes = [];
      }
      normalize(child, sample, type) {
        let keepBefore = /* @__PURE__ */ new Set();
        for (let node of Array.isArray(child) ? child : [child]) {
          if (node && typeof node === "object" && !node.parent && node.raws && typeof node.raws.before !== "undefined") {
            keepBefore.add(node.raws);
          }
        }
        let nodes = super.normalize(child);
        if (sample) {
          if (type === "prepend") {
            if (this.nodes.length > 1) {
              sample.raws.before = this.nodes[1].raws.before;
            } else {
              delete sample.raws.before;
            }
          } else if (this.first !== sample) {
            for (let node of nodes) {
              if (!keepBefore.has(node.raws)) {
                node.raws.before = sample.raws.before;
              }
            }
          }
        }
        return nodes;
      }
      removeChild(child, ignore) {
        let index = this.index(child);
        if (!ignore && index === 0 && this.nodes.length > 1) {
          this.nodes[1].raws.before = this.nodes[index].raws.before;
        }
        return super.removeChild(child);
      }
      toResult(opts = {}) {
        let lazy = new LazyResult(new Processor(), this, opts);
        return lazy.stringify();
      }
    };
    Root2.registerLazyResult = (dependant) => {
      LazyResult = dependant;
    };
    Root2.registerProcessor = (dependant) => {
      Processor = dependant;
    };
    module.exports = Root2;
    Root2.default = Root2;
    Container.registerRoot(Root2);
  }
});

// node_modules/postcss/lib/list.js
var require_list = __commonJS({
  "node_modules/postcss/lib/list.js"(exports, module) {
    "use strict";
    var list = {
      comma(string) {
        return list.split(string, [","], true);
      },
      space(string) {
        let spaces = [" ", "\n", "	"];
        return list.split(string, spaces);
      },
      split(string, separators, last) {
        if (typeof string !== "string") return [];
        let array = [];
        let current = "";
        let split = false;
        let func = 0;
        let inQuote = false;
        let prevQuote = "";
        let escape2 = false;
        let inComment = false;
        for (let i = 0; i < string.length; i++) {
          let letter = string[i];
          if (inComment) {
            current += letter;
            if (letter === "*" && string[i + 1] === "/") {
              current += "/";
              i += 1;
              inComment = false;
            }
            continue;
          }
          if (escape2) {
            escape2 = false;
          } else if (letter === "\\") {
            escape2 = true;
          } else if (inQuote) {
            if (letter === prevQuote) {
              inQuote = false;
            }
          } else if (letter === '"' || letter === "'") {
            inQuote = true;
            prevQuote = letter;
          } else if (letter === "/" && string[i + 1] === "*") {
            current += "/*";
            i += 1;
            inComment = true;
            continue;
          } else if (letter === "(") {
            func += 1;
          } else if (letter === ")") {
            if (func > 0) func -= 1;
          } else if (func === 0) {
            if (separators.includes(letter)) split = true;
          }
          if (split) {
            let value2 = current.trim();
            if (last || value2 !== "") array.push(value2);
            current = "";
            split = false;
          } else {
            current += letter;
          }
        }
        let value = current.trim();
        if (last || value !== "") array.push(value);
        return array;
      }
    };
    module.exports = list;
    list.default = list;
  }
});

// node_modules/postcss/lib/rule.js
var require_rule = __commonJS({
  "node_modules/postcss/lib/rule.js"(exports, module) {
    "use strict";
    var Container = require_container();
    var list = require_list();
    var Rule = class extends Container {
      get selectors() {
        return list.comma(this.selector);
      }
      set selectors(values) {
        let match = this.selector ? this.selector.match(/,\s*/) : null;
        let sep = match ? match[0] : "," + this.raw("between", "beforeOpen");
        this.selector = values.join(sep);
      }
      constructor(defaults) {
        super(defaults);
        this.type = "rule";
        if (!this.nodes) this.nodes = [];
      }
    };
    module.exports = Rule;
    Rule.default = Rule;
    Container.registerRule(Rule);
  }
});

// node_modules/postcss/lib/fromJSON.js
var require_fromJSON = __commonJS({
  "node_modules/postcss/lib/fromJSON.js"(exports, module) {
    "use strict";
    var AtRule = require_at_rule();
    var Comment3 = require_comment();
    var Declaration = require_declaration();
    var Input = require_input();
    var PreviousMap = require_previous_map();
    var Root2 = require_root();
    var Rule = require_rule();
    function hydrateInputs(json, inputs) {
      if (!json.inputs) return inputs;
      return json.inputs.map((input) => {
        let inputHydrated = { ...input, __proto__: Input.prototype };
        if (inputHydrated.map) {
          inputHydrated.map = {
            ...inputHydrated.map,
            __proto__: PreviousMap.prototype
          };
        }
        return inputHydrated;
      });
    }
    function constructNode(json, inputs, children) {
      let defaults = { ...json };
      delete defaults.inputs;
      delete defaults.nodes;
      if (defaults.source) {
        let { inputId, ...source } = defaults.source;
        defaults.source = source;
        if (inputId != null) {
          defaults.source.input = inputs[inputId];
        }
      }
      let node;
      if (defaults.type === "root") {
        node = new Root2(defaults);
      } else if (defaults.type === "decl") {
        node = new Declaration(defaults);
      } else if (defaults.type === "rule") {
        node = new Rule(defaults);
      } else if (defaults.type === "comment") {
        node = new Comment3(defaults);
      } else if (defaults.type === "atrule") {
        node = new AtRule(defaults);
      } else {
        throw new Error("Unknown node type: " + json.type);
      }
      if (children) {
        node.nodes = children;
        for (let child of children) child.parent = node;
      }
      return node;
    }
    function fromJSON(json, inputs) {
      if (Array.isArray(json)) return json.map((n) => fromJSON(n));
      let result;
      let stack = [
        { childIndex: 0, children: [], inputs: hydrateInputs(json, inputs), json }
      ];
      while (stack.length > 0) {
        let frame = stack[stack.length - 1];
        let jsonNodes = frame.json.nodes;
        if (jsonNodes && frame.childIndex < jsonNodes.length) {
          let childJson = jsonNodes[frame.childIndex];
          frame.childIndex += 1;
          stack.push({
            childIndex: 0,
            children: [],
            inputs: hydrateInputs(childJson, frame.inputs),
            json: childJson
          });
          continue;
        }
        stack.pop();
        let node = constructNode(
          frame.json,
          frame.inputs,
          jsonNodes ? frame.children : void 0
        );
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        } else {
          result = node;
        }
      }
      return result;
    }
    module.exports = fromJSON;
    fromJSON.default = fromJSON;
  }
});

// node_modules/postcss/lib/map-generator.js
var require_map_generator = __commonJS({
  "node_modules/postcss/lib/map-generator.js"(exports, module) {
    "use strict";
    var { dirname, relative, resolve, sep } = __require("path");
    var { SourceMapConsumer, SourceMapGenerator } = require_source_map();
    var { pathToFileURL } = __require("url");
    var Input = require_input();
    var sourceMapAvailable = Boolean(SourceMapConsumer && SourceMapGenerator);
    var pathAvailable = Boolean(dirname && resolve && relative && sep);
    var MapGenerator = class {
      constructor(stringify, root, opts, cssString) {
        this.stringify = stringify;
        this.mapOpts = opts.map || {};
        this.root = root;
        this.opts = opts;
        this.css = cssString;
        this.originalCSS = cssString;
        this.usesFileUrls = !this.mapOpts.from && this.mapOpts.absolute;
        this.memoizedFileURLs = /* @__PURE__ */ new Map();
        this.memoizedPaths = /* @__PURE__ */ new Map();
        this.memoizedURLs = /* @__PURE__ */ new Map();
      }
      addAnnotation() {
        let content;
        if (this.isInline()) {
          content = "data:application/json;base64," + this.toBase64(this.map.toString());
        } else if (typeof this.mapOpts.annotation === "string") {
          content = this.mapOpts.annotation;
        } else if (typeof this.mapOpts.annotation === "function") {
          content = this.mapOpts.annotation(this.opts.to, this.root);
        } else {
          content = this.outputFile() + ".map";
        }
        let eol = "\n";
        if (this.css.includes("\r\n")) eol = "\r\n";
        this.css += eol + "/*# sourceMappingURL=" + content + " */";
      }
      applyPrevMaps() {
        for (let prev of this.previous()) {
          let from = this.toUrl(this.path(prev.file));
          let root = prev.root || dirname(prev.file);
          let map;
          if (this.mapOpts.sourcesContent === false) {
            map = new SourceMapConsumer(prev.text);
            if (map.sourcesContent) {
              map.sourcesContent = null;
            }
          } else {
            map = prev.consumer();
          }
          this.map.applySourceMap(map, from, this.toUrl(this.path(root)));
        }
      }
      clearAnnotation() {
        if (this.mapOpts.annotation === false) return;
        if (this.root) {
          let node;
          for (let i = this.root.nodes.length - 1; i >= 0; i--) {
            node = this.root.nodes[i];
            if (node.type !== "comment") continue;
            if (node.text.startsWith("# sourceMappingURL=")) {
              this.root.removeChild(i);
            }
          }
        } else if (this.css) {
          let annotation = "/*# sourceMappingURL=";
          let css = "";
          let cursor = 0;
          let startIndex;
          while ((startIndex = this.css.indexOf(annotation, cursor)) !== -1) {
            let endIndex = this.css.indexOf("*/", startIndex + annotation.length);
            if (endIndex === -1) break;
            if (endIndex + 2 === this.css.length || /[\t\n\f\r ]/.test(this.css[endIndex + 2])) {
              while (startIndex > cursor && (this.css[startIndex - 1] === "\n" || this.css[startIndex - 1] === "\r")) {
                startIndex--;
              }
            }
            css += this.css.slice(cursor, startIndex);
            cursor = endIndex + 2;
          }
          if (cursor > 0) this.css = css + this.css.slice(cursor);
        }
      }
      generate() {
        this.clearAnnotation();
        if (pathAvailable && sourceMapAvailable && this.isMap()) {
          return this.generateMap();
        } else {
          let result = "";
          this.stringify(this.root, (i) => {
            result += i;
          });
          return [result];
        }
      }
      generateMap() {
        if (this.root) {
          this.generateString();
        } else if (this.previous().length === 1) {
          let prev = this.previous()[0].consumer();
          prev.file = this.outputFile();
          this.map = SourceMapGenerator.fromSourceMap(prev, {
            ignoreInvalidMapping: true
          });
        } else {
          this.map = new SourceMapGenerator({
            file: this.outputFile(),
            ignoreInvalidMapping: true
          });
          this.map.addMapping({
            generated: { column: 0, line: 1 },
            original: { column: 0, line: 1 },
            source: this.opts.from ? this.toUrl(this.path(this.opts.from)) : "<no source>"
          });
        }
        if (this.isSourcesContent()) this.setSourcesContent();
        if (this.root && this.previous().length > 0) this.applyPrevMaps();
        if (this.isAnnotation()) this.addAnnotation();
        if (this.isInline()) {
          return [this.css];
        } else {
          return [this.css, this.map];
        }
      }
      generateString() {
        this.css = "";
        this.map = new SourceMapGenerator({
          file: this.outputFile(),
          ignoreInvalidMapping: true
        });
        let line = 1;
        let column = 1;
        let noSource = "<no source>";
        let mapping = {
          generated: { column: 0, line: 0 },
          original: { column: 0, line: 0 },
          source: ""
        };
        let last, lines;
        this.stringify(this.root, (str, node, type) => {
          this.css += str;
          if (node && type !== "end") {
            mapping.generated.line = line;
            mapping.generated.column = column - 1;
            if (node.source && node.source.start) {
              mapping.source = this.sourcePath(node);
              mapping.original.line = node.source.start.line;
              mapping.original.column = node.source.start.column - 1;
              this.map.addMapping(mapping);
            } else {
              mapping.source = noSource;
              mapping.original.line = 1;
              mapping.original.column = 0;
              this.map.addMapping(mapping);
            }
          }
          lines = str.match(/\n/g);
          if (lines) {
            line += lines.length;
            last = str.lastIndexOf("\n");
            column = str.length - last;
          } else {
            column += str.length;
          }
          if (node && type !== "start") {
            let p = node.parent || { raws: {} };
            let childless = node.type === "decl" || node.type === "atrule" && !node.nodes;
            if (!childless || node !== p.last || p.raws.semicolon) {
              if (node.source && node.source.end) {
                mapping.source = this.sourcePath(node);
                mapping.original.line = node.source.end.line;
                mapping.original.column = node.source.end.column - 1;
                mapping.generated.line = line;
                mapping.generated.column = column - 2;
                this.map.addMapping(mapping);
              } else {
                mapping.source = noSource;
                mapping.original.line = 1;
                mapping.original.column = 0;
                mapping.generated.line = line;
                mapping.generated.column = column - 1;
                this.map.addMapping(mapping);
              }
            }
          }
        });
      }
      isAnnotation() {
        if (this.isInline()) {
          return true;
        }
        if (typeof this.mapOpts.annotation !== "undefined") {
          return this.mapOpts.annotation;
        }
        if (this.previous().length) {
          return this.previous().some((i) => i.annotation);
        }
        return true;
      }
      isInline() {
        if (typeof this.mapOpts.inline !== "undefined") {
          return this.mapOpts.inline;
        }
        let annotation = this.mapOpts.annotation;
        if (typeof annotation !== "undefined" && annotation !== true) {
          return false;
        }
        if (this.previous().length) {
          return this.previous().some((i) => i.inline);
        }
        return true;
      }
      isMap() {
        if (typeof this.opts.map !== "undefined") {
          return !!this.opts.map;
        }
        return this.previous().length > 0;
      }
      isSourcesContent() {
        if (typeof this.mapOpts.sourcesContent !== "undefined") {
          return this.mapOpts.sourcesContent;
        }
        if (this.previous().length) {
          return this.previous().some((i) => i.withContent());
        }
        return true;
      }
      outputFile() {
        if (this.opts.to) {
          return this.path(this.opts.to);
        } else if (this.opts.from) {
          return this.path(this.opts.from);
        } else {
          return "to.css";
        }
      }
      path(file) {
        if (this.mapOpts.absolute) return file;
        if (file.charCodeAt(0) === 60) return file;
        if (/^\w+:\/\//.test(file)) return file;
        let cached = this.memoizedPaths.get(file);
        if (cached) return cached;
        let from = this.opts.to ? dirname(this.opts.to) : ".";
        if (typeof this.mapOpts.annotation === "string") {
          from = dirname(resolve(from, this.mapOpts.annotation));
        }
        let path5 = relative(from, file);
        this.memoizedPaths.set(file, path5);
        return path5;
      }
      previous() {
        if (!this.previousMaps) {
          this.previousMaps = [];
          if (this.root) {
            this.root.walk((node) => {
              if (node.source && node.source.input.map) {
                let map = node.source.input.map;
                if (!this.previousMaps.includes(map)) {
                  this.previousMaps.push(map);
                }
              }
            });
          } else {
            let input = new Input(this.originalCSS, this.opts);
            if (input.map) this.previousMaps.push(input.map);
          }
        }
        return this.previousMaps;
      }
      setSourcesContent() {
        let already = {};
        if (this.root) {
          this.root.walk((node) => {
            if (node.source) {
              let from = node.source.input.from;
              if (from && !already[from]) {
                already[from] = true;
                let fromUrl = this.usesFileUrls ? this.toFileUrl(from) : this.toUrl(this.path(from));
                this.map.setSourceContent(fromUrl, node.source.input.css);
              }
            }
          });
        } else if (this.css) {
          let from = this.opts.from ? this.toUrl(this.path(this.opts.from)) : "<no source>";
          this.map.setSourceContent(from, this.css);
        }
      }
      sourcePath(node) {
        if (this.mapOpts.from) {
          return this.toUrl(this.mapOpts.from);
        } else if (this.usesFileUrls) {
          return this.toFileUrl(node.source.input.from);
        } else {
          return this.toUrl(this.path(node.source.input.from));
        }
      }
      toBase64(str) {
        if (Buffer) {
          return Buffer.from(str).toString("base64");
        } else {
          return window.btoa(unescape(encodeURIComponent(str)));
        }
      }
      toFileUrl(path5) {
        let cached = this.memoizedFileURLs.get(path5);
        if (cached) return cached;
        if (pathToFileURL) {
          let fileURL = pathToFileURL(path5).toString();
          this.memoizedFileURLs.set(path5, fileURL);
          return fileURL;
        } else {
          throw new Error(
            "`map.absolute` option is not available in this PostCSS build"
          );
        }
      }
      toUrl(path5) {
        let cached = this.memoizedURLs.get(path5);
        if (cached) return cached;
        if (sep === "\\") {
          path5 = path5.replace(/\\/g, "/");
        }
        let url = encodeURI(path5).replace(/[#?]/g, encodeURIComponent);
        this.memoizedURLs.set(path5, url);
        return url;
      }
    };
    module.exports = MapGenerator;
  }
});

// node_modules/postcss/lib/parser.js
var require_parser = __commonJS({
  "node_modules/postcss/lib/parser.js"(exports, module) {
    "use strict";
    var AtRule = require_at_rule();
    var Comment3 = require_comment();
    var Declaration = require_declaration();
    var Root2 = require_root();
    var Rule = require_rule();
    var tokenizer = require_tokenize();
    var SAFE_COMMENT_NEIGHBOR = {
      empty: true,
      space: true
    };
    function findLastWithPosition(tokens) {
      for (let i = tokens.length - 1; i >= 0; i--) {
        let token = tokens[i];
        let pos = token[3] || token[2];
        if (pos) return pos;
      }
    }
    function tokensToString(tokens, from, to) {
      let result = "";
      for (let i = from; i < to; i++) result += tokens[i][1];
      return result;
    }
    var Parser2 = class {
      constructor(input) {
        this.input = input;
        this.root = new Root2();
        this.current = this.root;
        this.spaces = "";
        this.semicolon = false;
        this.createTokenizer();
        this.root.source = { input, start: { column: 1, line: 1, offset: 0 } };
      }
      atrule(token) {
        let node = new AtRule();
        node.name = token[1].slice(1);
        if (node.name === "") {
          this.unnamedAtrule(node, token);
        }
        this.init(node, token[2]);
        let type;
        let prev;
        let shift;
        let last = false;
        let open = false;
        let params = [];
        let brackets = [];
        while (!this.tokenizer.endOfFile()) {
          token = this.tokenizer.nextToken();
          type = token[0];
          if (type === "(" || type === "[") {
            brackets.push(type === "(" ? ")" : "]");
          } else if (type === "{" && brackets.length > 0) {
            brackets.push("}");
          } else if (type === brackets[brackets.length - 1]) {
            brackets.pop();
          }
          if (brackets.length === 0) {
            if (type === ";") {
              node.source.end = this.getPosition(token[2]);
              node.source.end.offset++;
              this.semicolon = true;
              break;
            } else if (type === "{") {
              open = true;
              break;
            } else if (type === "}") {
              if (params.length > 0) {
                shift = params.length - 1;
                prev = params[shift];
                while (prev && prev[0] === "space") {
                  prev = params[--shift];
                }
                if (prev) {
                  node.source.end = this.getPosition(prev[3] || prev[2]);
                  node.source.end.offset++;
                }
              }
              this.end(token);
              break;
            } else {
              params.push(token);
            }
          } else {
            params.push(token);
          }
          if (this.tokenizer.endOfFile()) {
            last = true;
            break;
          }
        }
        node.raws.between = this.spacesAndCommentsFromEnd(params);
        if (params.length) {
          node.raws.afterName = this.spacesAndCommentsFromStart(params);
          this.raw(node, "params", params);
          if (last) {
            token = params[params.length - 1];
            node.source.end = this.getPosition(token[3] || token[2]);
            node.source.end.offset++;
            this.spaces = node.raws.between;
            node.raws.between = "";
          }
        } else {
          node.raws.afterName = "";
          node.params = "";
        }
        if (open) {
          node.nodes = [];
          this.current = node;
        }
      }
      checkMissedSemicolon(tokens) {
        let colon = this.colon(tokens);
        if (colon === false) return;
        let founded = 0;
        let token;
        for (let j = colon - 1; j >= 0; j--) {
          token = tokens[j];
          if (token[0] !== "space") {
            founded += 1;
            if (founded === 2) break;
          }
        }
        throw this.input.error(
          "Missed semicolon",
          token[0] === "word" ? token[3] + 1 : token[2]
        );
      }
      colon(tokens) {
        let brackets = 0;
        let prev, token, type;
        for (let [i, element] of tokens.entries()) {
          token = element;
          type = token[0];
          if (type === "(") {
            brackets += 1;
          }
          if (type === ")") {
            brackets -= 1;
          }
          if (brackets === 0 && type === ":") {
            if (!prev) {
              this.doubleColon(token);
            } else if (prev[0] === "word" && prev[1] === "progid") {
              continue;
            } else {
              return i;
            }
          }
          prev = token;
        }
        return false;
      }
      comment(token) {
        let node = new Comment3();
        this.init(node, token[2]);
        node.source.end = this.getPosition(token[3] || token[2]);
        node.source.end.offset++;
        let text = token[1].slice(2, -2);
        if (!text.trim()) {
          node.text = "";
          node.raws.left = text;
          node.raws.right = "";
        } else {
          let match = text.match(/^(\s*)([^]*\S)(\s*)$/);
          node.text = match[2];
          node.raws.left = match[1];
          node.raws.right = match[3];
        }
      }
      createTokenizer() {
        this.tokenizer = tokenizer(this.input);
      }
      decl(tokens, customProperty) {
        let node = new Declaration();
        this.init(node, tokens[0][2]);
        let last = tokens[tokens.length - 1];
        if (last[0] === ";") {
          this.semicolon = true;
          tokens.pop();
        }
        node.source.end = this.getPosition(
          last[3] || last[2] || findLastWithPosition(tokens)
        );
        node.source.end.offset++;
        let start = 0;
        while (tokens[start][0] !== "word") {
          if (start === tokens.length - 1) this.unknownWord([tokens[start]]);
          start++;
        }
        node.raws.before += tokensToString(tokens, 0, start);
        node.source.start = this.getPosition(tokens[start][2]);
        let propStart = start;
        while (start < tokens.length) {
          let type = tokens[start][0];
          if (type === ":" || type === "space" || type === "comment") {
            break;
          }
          start++;
        }
        node.prop = tokensToString(tokens, propStart, start);
        let betweenStart = start;
        let token;
        while (start < tokens.length) {
          token = tokens[start];
          start++;
          if (token[0] === ":") break;
          if (token[0] === "word" && /\w/.test(token[1])) {
            this.unknownWord([token]);
          }
        }
        node.raws.between = tokensToString(tokens, betweenStart, start);
        if (node.prop[0] === "_" || node.prop[0] === "*") {
          node.raws.before += node.prop[0];
          node.prop = node.prop.slice(1);
        }
        let firstSpacesStart = start;
        while (start < tokens.length) {
          let next = tokens[start][0];
          if (next !== "space" && next !== "comment") break;
          start++;
        }
        let firstSpaces = tokens.slice(firstSpacesStart, start);
        tokens = tokens.slice(start);
        this.precheckMissedSemicolon(tokens);
        for (let i = tokens.length - 1; i >= 0; i--) {
          token = tokens[i];
          if (token[1].toLowerCase() === "!important") {
            node.important = true;
            let string = this.stringFrom(tokens, i);
            string = this.spacesFromEnd(tokens) + string;
            if (string !== " !important") node.raws.important = string;
            break;
          } else if (token[1].toLowerCase() === "important") {
            let cache = tokens.slice(0);
            let str = "";
            for (let j = i; j > 0; j--) {
              let type = cache[j][0];
              if (str.trim().startsWith("!") && type !== "space") {
                break;
              }
              str = cache.pop()[1] + str;
            }
            if (str.trim().startsWith("!")) {
              node.important = true;
              node.raws.important = str;
              tokens = cache;
            }
          }
          if (token[0] !== "space" && token[0] !== "comment") {
            break;
          }
        }
        let hasWord = tokens.some((i) => i[0] !== "space" && i[0] !== "comment");
        if (hasWord) {
          node.raws.between += firstSpaces.map((i) => i[1]).join("");
          firstSpaces = [];
        }
        this.raw(node, "value", firstSpaces.concat(tokens), customProperty);
        if (node.value.includes(":") && !customProperty) {
          this.checkMissedSemicolon(tokens);
        }
      }
      doubleColon(token) {
        throw this.input.error(
          "Double colon",
          { offset: token[2] },
          { offset: token[2] + token[1].length }
        );
      }
      emptyRule(token) {
        let node = new Rule();
        this.init(node, token[2]);
        node.selector = "";
        node.raws.between = "";
        this.current = node;
      }
      end(token) {
        if (this.current.nodes && this.current.nodes.length) {
          this.current.raws.semicolon = this.semicolon;
        }
        this.semicolon = false;
        this.current.raws.after = (this.current.raws.after || "") + this.spaces;
        this.spaces = "";
        if (this.current.parent) {
          this.current.source.end = this.getPosition(token[2]);
          this.current.source.end.offset++;
          this.current = this.current.parent;
        } else {
          this.unexpectedClose(token);
        }
      }
      endFile() {
        if (this.current.parent) this.unclosedBlock();
        if (this.current.nodes && this.current.nodes.length) {
          this.current.raws.semicolon = this.semicolon;
        }
        this.current.raws.after = (this.current.raws.after || "") + this.spaces;
        this.root.source.end = this.getPosition(this.tokenizer.position());
      }
      freeSemicolon(token) {
        this.spaces += token[1];
        if (this.current.nodes) {
          let prev = this.current.nodes[this.current.nodes.length - 1];
          if (prev && prev.type === "rule" && !prev.raws.ownSemicolon) {
            prev.raws.ownSemicolon = this.spaces;
            this.spaces = "";
            prev.source.end = this.getPosition(token[2]);
            prev.source.end.offset++;
          }
        }
      }
      // Helpers
      getPosition(offset) {
        let pos = this.input.fromOffset(offset);
        return {
          column: pos.col,
          line: pos.line,
          offset
        };
      }
      init(node, offset) {
        this.current.push(node);
        node.source = {
          input: this.input,
          start: this.getPosition(offset)
        };
        node.raws.before = this.spaces;
        this.spaces = "";
        if (node.type !== "comment") this.semicolon = false;
      }
      other(start) {
        let end = false;
        let type = null;
        let colon = false;
        let bracket = null;
        let brackets = [];
        let customProperty = start[1].startsWith("--");
        let tokens = [];
        let token = start;
        while (token) {
          type = token[0];
          tokens.push(token);
          if (type === "(" || type === "[") {
            if (!bracket) bracket = token;
            brackets.push(type === "(" ? ")" : "]");
          } else if (customProperty && colon && type === "{") {
            if (!bracket) bracket = token;
            brackets.push("}");
          } else if (brackets.length === 0) {
            if (type === ";") {
              if (colon) {
                this.decl(tokens, customProperty);
                return;
              } else {
                break;
              }
            } else if (type === "{") {
              this.rule(tokens);
              return;
            } else if (type === "}") {
              this.tokenizer.back(tokens.pop());
              end = true;
              break;
            } else if (type === ":") {
              colon = true;
            }
          } else if (type === brackets[brackets.length - 1]) {
            brackets.pop();
            if (brackets.length === 0) bracket = null;
          }
          token = this.tokenizer.nextToken();
        }
        if (this.tokenizer.endOfFile()) end = true;
        if (brackets.length > 0) this.unclosedBracket(bracket);
        if (end && colon) {
          if (!customProperty) {
            while (tokens.length) {
              token = tokens[tokens.length - 1][0];
              if (token !== "space" && token !== "comment") break;
              this.tokenizer.back(tokens.pop());
            }
          }
          this.decl(tokens, customProperty);
        } else {
          this.unknownWord(tokens);
        }
      }
      parse() {
        let token;
        while (!this.tokenizer.endOfFile()) {
          token = this.tokenizer.nextToken();
          switch (token[0]) {
            case "space":
              this.spaces += token[1];
              break;
            case ";":
              this.freeSemicolon(token);
              break;
            case "}":
              this.end(token);
              break;
            case "comment":
              this.comment(token);
              break;
            case "at-word":
              this.atrule(token);
              break;
            case "{":
              this.emptyRule(token);
              break;
            default:
              this.other(token);
              break;
          }
        }
        this.endFile();
      }
      precheckMissedSemicolon() {
      }
      raw(node, prop, tokens, customProperty) {
        let token, type;
        let length = tokens.length;
        let value = "";
        let last = "";
        let clean = true;
        let next, prev;
        for (let i = 0; i < length; i += 1) {
          token = tokens[i];
          type = token[0];
          if (type === "space" && i === length - 1 && !customProperty) {
            clean = false;
          } else if (type === "comment") {
            prev = tokens[i - 1] ? tokens[i - 1][0] : "empty";
            next = tokens[i + 1] ? tokens[i + 1][0] : "empty";
            if (!SAFE_COMMENT_NEIGHBOR[prev] && !SAFE_COMMENT_NEIGHBOR[next]) {
              if (last === ",") {
                clean = false;
              } else {
                value += token[1];
                last = token[1].slice(-1);
              }
            } else {
              clean = false;
            }
          } else {
            value += token[1];
            last = token[1].slice(-1);
          }
        }
        if (!clean) {
          let raw = tokens.reduce((all, i) => all + i[1], "");
          node.raws[prop] = { raw, value };
        }
        node[prop] = value;
      }
      rule(tokens) {
        tokens.pop();
        let node = new Rule();
        this.init(node, tokens[0][2]);
        node.raws.between = this.spacesAndCommentsFromEnd(tokens);
        this.raw(node, "selector", tokens);
        this.current = node;
      }
      spacesAndCommentsFromEnd(tokens) {
        let lastTokenType;
        let spaces = "";
        while (tokens.length) {
          lastTokenType = tokens[tokens.length - 1][0];
          if (lastTokenType !== "space" && lastTokenType !== "comment") break;
          spaces = tokens.pop()[1] + spaces;
        }
        return spaces;
      }
      // Errors
      spacesAndCommentsFromStart(tokens) {
        let next;
        let spaces = "";
        while (tokens.length) {
          next = tokens[0][0];
          if (next !== "space" && next !== "comment") break;
          spaces += tokens.shift()[1];
        }
        return spaces;
      }
      spacesFromEnd(tokens) {
        let lastTokenType;
        let spaces = "";
        while (tokens.length) {
          lastTokenType = tokens[tokens.length - 1][0];
          if (lastTokenType !== "space") break;
          spaces = tokens.pop()[1] + spaces;
        }
        return spaces;
      }
      stringFrom(tokens, from) {
        let result = "";
        for (let i = from; i < tokens.length; i++) {
          result += tokens[i][1];
        }
        tokens.splice(from, tokens.length - from);
        return result;
      }
      unclosedBlock() {
        let pos = this.current.source.start;
        throw this.input.error("Unclosed block", pos.line, pos.column);
      }
      unclosedBracket(bracket) {
        throw this.input.error(
          "Unclosed bracket",
          { offset: bracket[2] },
          { offset: bracket[2] + 1 }
        );
      }
      unexpectedClose(token) {
        throw this.input.error(
          "Unexpected }",
          { offset: token[2] },
          { offset: token[2] + 1 }
        );
      }
      unknownWord(tokens) {
        throw this.input.error(
          "Unknown word " + tokens[0][1],
          { offset: tokens[0][2] },
          { offset: tokens[0][2] + tokens[0][1].length }
        );
      }
      unnamedAtrule(node, token) {
        throw this.input.error(
          "At-rule without name",
          { offset: token[2] },
          { offset: token[2] + token[1].length }
        );
      }
    };
    module.exports = Parser2;
  }
});

// node_modules/postcss/lib/parse.js
var require_parse = __commonJS({
  "node_modules/postcss/lib/parse.js"(exports, module) {
    "use strict";
    var Container = require_container();
    var Input = require_input();
    var Parser2 = require_parser();
    function parse(css, opts) {
      let input = new Input(css, opts);
      let parser = new Parser2(input);
      try {
        parser.parse();
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          if (e.name === "CssSyntaxError" && opts && opts.from) {
            if (/\.scss$/i.test(opts.from)) {
              e.message += "\nYou tried to parse SCSS with the standard CSS parser; try again with the postcss-scss parser";
            } else if (/\.sass/i.test(opts.from)) {
              e.message += "\nYou tried to parse Sass with the standard CSS parser; try again with the postcss-sass parser";
            } else if (/\.less$/i.test(opts.from)) {
              e.message += "\nYou tried to parse Less with the standard CSS parser; try again with the postcss-less parser";
            }
          }
        }
        throw e;
      }
      return parser.root;
    }
    module.exports = parse;
    parse.default = parse;
    Container.registerParse(parse);
  }
});

// node_modules/postcss/lib/warning.js
var require_warning = __commonJS({
  "node_modules/postcss/lib/warning.js"(exports, module) {
    "use strict";
    var Container = require_container();
    var { my } = require_symbols();
    var Warning = class {
      constructor(text, opts = {}) {
        this.type = "warning";
        this.text = text;
        if (opts.node && opts.node.source) {
          if (!opts.node[my]) {
            Container.rebuild(opts.node);
          }
          let range = opts.node.rangeBy(opts);
          this.line = range.start.line;
          this.column = range.start.column;
          this.endLine = range.end.line;
          this.endColumn = range.end.column;
        }
        for (let opt in opts) this[opt] = opts[opt];
      }
      toString() {
        if (this.node) {
          return this.node.error(this.text, {
            index: this.index,
            plugin: this.plugin,
            start: this.start,
            word: this.word
          }).message;
        }
        if (this.plugin) {
          return this.plugin + ": " + this.text;
        }
        return this.text;
      }
    };
    module.exports = Warning;
    Warning.default = Warning;
  }
});

// node_modules/postcss/lib/result.js
var require_result = __commonJS({
  "node_modules/postcss/lib/result.js"(exports, module) {
    "use strict";
    var Warning = require_warning();
    var Result = class {
      get content() {
        return this.css;
      }
      constructor(processor, root, opts) {
        this.processor = processor;
        this.messages = [];
        this.root = root;
        this.opts = opts;
        this.css = "";
        this.map = void 0;
      }
      toString() {
        return this.css;
      }
      warn(text, opts = {}) {
        if (!opts.plugin) {
          if (this.lastPlugin && this.lastPlugin.postcssPlugin) {
            opts.plugin = this.lastPlugin.postcssPlugin;
          }
        }
        let warning = new Warning(text, opts);
        this.messages.push(warning);
        return warning;
      }
      warnings() {
        return this.messages.filter((i) => i.type === "warning");
      }
    };
    module.exports = Result;
    Result.default = Result;
  }
});

// node_modules/postcss/lib/warn-once.js
var require_warn_once = __commonJS({
  "node_modules/postcss/lib/warn-once.js"(exports, module) {
    "use strict";
    var printed = {};
    module.exports = function warnOnce(message) {
      if (printed[message]) return;
      printed[message] = true;
      if (typeof console !== "undefined" && console.warn) {
        console.warn(message);
      }
    };
  }
});

// node_modules/postcss/lib/lazy-result.js
var require_lazy_result = __commonJS({
  "node_modules/postcss/lib/lazy-result.js"(exports, module) {
    "use strict";
    var Container = require_container();
    var Document2 = require_document();
    var MapGenerator = require_map_generator();
    var parse = require_parse();
    var Result = require_result();
    var Root2 = require_root();
    var stringify = require_stringify();
    var { isClean, my } = require_symbols();
    var warnOnce = require_warn_once();
    var TYPE_TO_CLASS_NAME = {
      atrule: "AtRule",
      comment: "Comment",
      decl: "Declaration",
      document: "Document",
      root: "Root",
      rule: "Rule"
    };
    var PLUGIN_PROPS = {
      AtRule: true,
      AtRuleExit: true,
      Comment: true,
      CommentExit: true,
      Declaration: true,
      DeclarationExit: true,
      Document: true,
      DocumentExit: true,
      Once: true,
      OnceExit: true,
      postcssPlugin: true,
      prepare: true,
      Root: true,
      RootExit: true,
      Rule: true,
      RuleExit: true
    };
    var NOT_VISITORS = {
      Once: true,
      postcssPlugin: true,
      prepare: true
    };
    var CHILDREN = 0;
    function isPromise(obj) {
      return typeof obj === "object" && typeof obj.then === "function";
    }
    function getEvents(node) {
      let key = false;
      let type = TYPE_TO_CLASS_NAME[node.type];
      if (node.type === "decl") {
        key = node.prop.toLowerCase();
      } else if (node.type === "atrule") {
        key = node.name.toLowerCase();
      }
      if (key && node.append) {
        return [
          type,
          type + "-" + key,
          CHILDREN,
          type + "Exit",
          type + "Exit-" + key
        ];
      } else if (key) {
        return [type, type + "-" + key, type + "Exit", type + "Exit-" + key];
      } else if (node.append) {
        return [type, CHILDREN, type + "Exit"];
      } else {
        return [type, type + "Exit"];
      }
    }
    function toStack(node) {
      let events;
      if (node.type === "document") {
        events = ["Document", CHILDREN, "DocumentExit"];
      } else if (node.type === "root") {
        events = ["Root", CHILDREN, "RootExit"];
      } else {
        events = getEvents(node);
      }
      return {
        eventIndex: 0,
        events,
        iterator: 0,
        node,
        visitorIndex: 0,
        visitors: []
      };
    }
    function cleanMarks(node) {
      let stack = [node];
      while (stack.length > 0) {
        let next = stack.pop();
        next[isClean] = false;
        if (next.nodes) {
          for (let i of next.nodes) stack.push(i);
        }
      }
      return node;
    }
    var postcss = {};
    var LazyResult = class _LazyResult {
      get content() {
        return this.stringify().content;
      }
      get css() {
        return this.stringify().css;
      }
      get map() {
        return this.stringify().map;
      }
      get messages() {
        return this.sync().messages;
      }
      get opts() {
        return this.result.opts;
      }
      get processor() {
        return this.result.processor;
      }
      get root() {
        return this.sync().root;
      }
      get [Symbol.toStringTag]() {
        return "LazyResult";
      }
      constructor(processor, css, opts) {
        this.stringified = false;
        this.processed = false;
        let root;
        if (typeof css === "object" && css !== null && (css.type === "root" || css.type === "document")) {
          root = cleanMarks(css);
        } else if (css instanceof _LazyResult || css instanceof Result) {
          root = cleanMarks(css.root);
          if (css.map) {
            if (typeof opts.map === "undefined") opts.map = {};
            if (!opts.map.inline) opts.map.inline = false;
            opts.map.prev = css.map;
          }
        } else {
          let parser = parse;
          if (opts.syntax) parser = opts.syntax.parse;
          if (opts.parser) parser = opts.parser;
          if (parser.parse) parser = parser.parse;
          try {
            root = parser(css, opts);
          } catch (error) {
            this.processed = true;
            this.error = error;
          }
          if (root && !root[my]) {
            Container.rebuild(root);
          }
        }
        this.result = new Result(processor, root, opts);
        this.helpers = { ...postcss, postcss, result: this.result };
        this.plugins = this.processor.plugins.map((plugin) => {
          if (typeof plugin === "object" && plugin.prepare) {
            return { ...plugin, ...plugin.prepare(this.result) };
          } else {
            return plugin;
          }
        });
      }
      async() {
        if (this.error) return Promise.reject(this.error);
        if (this.processed) return Promise.resolve(this.result);
        if (!this.processing) {
          this.processing = this.runAsync();
        }
        return this.processing;
      }
      catch(onRejected) {
        return this.async().catch(onRejected);
      }
      finally(onFinally) {
        return this.async().finally(onFinally);
      }
      getAsyncError() {
        throw new Error("Use process(css).then(cb) to work with async plugins");
      }
      handleError(error, node) {
        let plugin = this.result.lastPlugin;
        try {
          if (node) node.addToError(error);
          this.error = error;
          if (error.name === "CssSyntaxError" && !error.plugin) {
            error.plugin = plugin.postcssPlugin;
            error.setMessage();
          } else if (plugin.postcssVersion) {
            if (process.env.NODE_ENV !== "production") {
              let pluginName = plugin.postcssPlugin;
              let pluginVer = plugin.postcssVersion;
              let runtimeVer = this.result.processor.version;
              let a = pluginVer.split(".");
              let b = runtimeVer.split(".");
              if (a[0] !== b[0] || parseInt(a[1]) > parseInt(b[1])) {
                console.error(
                  "Unknown error from PostCSS plugin. Your current PostCSS version is " + runtimeVer + ", but " + pluginName + " uses " + pluginVer + ". Perhaps this is the source of the error below."
                );
              }
            }
          }
        } catch (err) {
          if (console && console.error) console.error(err);
        }
        return error;
      }
      prepareVisitors() {
        this.listeners = {};
        let add = (plugin, type, cb) => {
          if (!this.listeners[type]) this.listeners[type] = [];
          this.listeners[type].push([plugin, cb]);
        };
        for (let plugin of this.plugins) {
          if (typeof plugin === "object") {
            for (let event in plugin) {
              if (!PLUGIN_PROPS[event] && /^[A-Z]/.test(event)) {
                throw new Error(
                  `Unknown event ${event} in ${plugin.postcssPlugin}. Try to update PostCSS (${this.processor.version} now).`
                );
              }
              if (!NOT_VISITORS[event]) {
                if (typeof plugin[event] === "object") {
                  for (let filter2 in plugin[event]) {
                    if (filter2 === "*") {
                      add(plugin, event, plugin[event][filter2]);
                    } else {
                      add(
                        plugin,
                        event + "-" + filter2.toLowerCase(),
                        plugin[event][filter2]
                      );
                    }
                  }
                } else if (typeof plugin[event] === "function") {
                  add(plugin, event, plugin[event]);
                }
              }
            }
          }
        }
        this.hasListener = Object.keys(this.listeners).length > 0;
      }
      async runAsync() {
        this.plugin = 0;
        for (let i = 0; i < this.plugins.length; i++) {
          let plugin = this.plugins[i];
          let promise = this.runOnRoot(plugin);
          if (isPromise(promise)) {
            try {
              await promise;
            } catch (error) {
              throw this.handleError(error);
            }
          }
        }
        this.prepareVisitors();
        if (this.hasListener) {
          let root = this.result.root;
          while (!root[isClean]) {
            root[isClean] = true;
            let stack = [toStack(root)];
            while (stack.length > 0) {
              let promise = this.visitTick(stack);
              if (isPromise(promise)) {
                try {
                  await promise;
                } catch (e) {
                  let node = stack[stack.length - 1].node;
                  throw this.handleError(e, node);
                }
              }
            }
          }
          if (this.listeners.OnceExit) {
            for (let [plugin, visitor] of this.listeners.OnceExit) {
              this.result.lastPlugin = plugin;
              try {
                if (root.type === "document") {
                  let roots = root.nodes.map(
                    (subRoot) => visitor(subRoot, this.helpers)
                  );
                  await Promise.all(roots);
                } else {
                  await visitor(root, this.helpers);
                }
              } catch (e) {
                throw this.handleError(e);
              }
            }
          }
        }
        this.processed = true;
        return this.stringify();
      }
      runOnRoot(plugin) {
        this.result.lastPlugin = plugin;
        try {
          if (typeof plugin === "object" && plugin.Once) {
            if (this.result.root.type === "document") {
              let roots = this.result.root.nodes.map(
                (root) => plugin.Once(root, this.helpers)
              );
              if (isPromise(roots[0])) {
                return Promise.all(roots);
              }
              return roots;
            }
            return plugin.Once(this.result.root, this.helpers);
          } else if (typeof plugin === "function") {
            return plugin(this.result.root, this.result);
          }
        } catch (error) {
          throw this.handleError(error);
        }
      }
      stringify() {
        if (this.error) throw this.error;
        if (this.stringified) return this.result;
        this.stringified = true;
        this.sync();
        let opts = this.result.opts;
        let str = stringify;
        if (opts.syntax) str = opts.syntax.stringify;
        if (opts.stringifier) str = opts.stringifier;
        if (str.stringify) str = str.stringify;
        let rootSource = this.result.root.source;
        if (opts.map === void 0 && !(rootSource && rootSource.input && rootSource.input.map)) {
          let result = "";
          str(this.result.root, (i) => {
            result += i;
          });
          this.result.css = result;
          return this.result;
        }
        let map = new MapGenerator(str, this.result.root, this.result.opts);
        let data = map.generate();
        this.result.css = data[0];
        this.result.map = data[1];
        return this.result;
      }
      sync() {
        if (this.error) throw this.error;
        if (this.processed) return this.result;
        this.processed = true;
        if (this.processing) {
          throw this.getAsyncError();
        }
        for (let plugin of this.plugins) {
          let promise = this.runOnRoot(plugin);
          if (isPromise(promise)) {
            throw this.getAsyncError();
          }
        }
        this.prepareVisitors();
        if (this.hasListener) {
          let root = this.result.root;
          while (!root[isClean]) {
            root[isClean] = true;
            this.walkSync(root);
          }
          if (this.listeners.OnceExit) {
            if (root.type === "document") {
              for (let subRoot of root.nodes) {
                this.visitSync(this.listeners.OnceExit, subRoot);
              }
            } else {
              this.visitSync(this.listeners.OnceExit, root);
            }
          }
        }
        return this.result;
      }
      then(onFulfilled, onRejected) {
        if (process.env.NODE_ENV !== "production") {
          if (!("from" in this.opts)) {
            warnOnce(
              "Without `from` option PostCSS could generate wrong source map and will not find Browserslist config. Set it to CSS file path or to `undefined` to prevent this warning."
            );
          }
        }
        return this.async().then(onFulfilled, onRejected);
      }
      toString() {
        return this.css;
      }
      visitSync(visitors, node) {
        for (let [plugin, visitor] of visitors) {
          this.result.lastPlugin = plugin;
          let promise;
          try {
            promise = visitor(node, this.helpers);
          } catch (e) {
            throw this.handleError(e, node.proxyOf);
          }
          if (node.type !== "root" && node.type !== "document" && !node.parent) {
            return true;
          }
          if (isPromise(promise)) {
            throw this.getAsyncError();
          }
        }
      }
      visitTick(stack) {
        let visit = stack[stack.length - 1];
        let { node, visitors } = visit;
        if (node.type !== "root" && node.type !== "document" && !node.parent) {
          stack.pop();
          return;
        }
        if (visitors.length > 0 && visit.visitorIndex < visitors.length) {
          let [plugin, visitor] = visitors[visit.visitorIndex];
          visit.visitorIndex += 1;
          if (visit.visitorIndex === visitors.length) {
            visit.visitors = [];
            visit.visitorIndex = 0;
          }
          this.result.lastPlugin = plugin;
          try {
            return visitor(node.toProxy(), this.helpers);
          } catch (e) {
            throw this.handleError(e, node);
          }
        }
        if (visit.iterator !== 0) {
          let iterator = visit.iterator;
          if (visit.descending) {
            visit.descending = false;
            node.indexes[iterator] += 1;
          }
          let child;
          while (child = node.nodes[node.indexes[iterator]]) {
            if (!child[isClean]) {
              child[isClean] = true;
              visit.descending = true;
              stack.push(toStack(child));
              return;
            }
            node.indexes[iterator] += 1;
          }
          visit.iterator = 0;
          delete node.indexes[iterator];
        }
        let events = visit.events;
        while (visit.eventIndex < events.length) {
          let event = events[visit.eventIndex];
          visit.eventIndex += 1;
          if (event === CHILDREN) {
            if (node.nodes && node.nodes.length) {
              node[isClean] = true;
              visit.iterator = node.getIterator();
            }
            return;
          } else if (this.listeners[event]) {
            visit.visitors = this.listeners[event];
            return;
          }
        }
        stack.pop();
      }
      walkSync(node) {
        node[isClean] = true;
        let stack = [{ eventIndex: 0, events: getEvents(node), iterator: 0, node }];
        while (stack.length > 0) {
          let visit = stack[stack.length - 1];
          let visitNode = visit.node;
          if (visit.iterator !== 0) {
            let iterator = visit.iterator;
            if (visit.descending) {
              visit.descending = false;
              visitNode.indexes[iterator] += 1;
            }
            let child;
            let descended = false;
            while (child = visitNode.nodes[visitNode.indexes[iterator]]) {
              if (!child[isClean]) {
                child[isClean] = true;
                visit.descending = true;
                stack.push({
                  eventIndex: 0,
                  events: getEvents(child),
                  iterator: 0,
                  node: child
                });
                descended = true;
                break;
              }
              visitNode.indexes[iterator] += 1;
            }
            if (descended) continue;
            visit.iterator = 0;
            delete visitNode.indexes[iterator];
          }
          if (visit.eventIndex < visit.events.length) {
            let event = visit.events[visit.eventIndex];
            visit.eventIndex += 1;
            if (event === CHILDREN) {
              if (visitNode.nodes && visitNode.nodes.length) {
                visit.iterator = visitNode.getIterator();
              }
            } else {
              let visitors = this.listeners[event];
              if (visitors) {
                if (this.visitSync(visitors, visitNode.toProxy())) stack.pop();
              }
            }
            continue;
          }
          stack.pop();
        }
      }
      warnings() {
        return this.sync().warnings();
      }
    };
    LazyResult.registerPostcss = (dependant) => {
      postcss = dependant;
    };
    module.exports = LazyResult;
    LazyResult.default = LazyResult;
    Root2.registerLazyResult(LazyResult);
    Document2.registerLazyResult(LazyResult);
  }
});

// node_modules/postcss/lib/no-work-result.js
var require_no_work_result = __commonJS({
  "node_modules/postcss/lib/no-work-result.js"(exports, module) {
    "use strict";
    var MapGenerator = require_map_generator();
    var parse = require_parse();
    var Result = require_result();
    var stringify = require_stringify();
    var warnOnce = require_warn_once();
    var NoWorkResult = class {
      get content() {
        return this.result.css;
      }
      get css() {
        return this.result.css;
      }
      get map() {
        return this.result.map;
      }
      get messages() {
        return [];
      }
      get opts() {
        return this.result.opts;
      }
      get processor() {
        return this.result.processor;
      }
      get root() {
        if (this._root) {
          return this._root;
        }
        let root;
        let parser = parse;
        try {
          root = parser(this._css, this._opts);
        } catch (error) {
          this.error = error;
        }
        if (this.error) {
          throw this.error;
        } else {
          this._root = root;
          return root;
        }
      }
      get [Symbol.toStringTag]() {
        return "NoWorkResult";
      }
      constructor(processor, css, opts) {
        css = css.toString();
        this.stringified = false;
        this._processor = processor;
        this._css = css;
        this._opts = opts;
        this._map = void 0;
        let str = stringify;
        this.result = new Result(this._processor, void 0, this._opts);
        this.result.css = css;
        let self2 = this;
        Object.defineProperty(this.result, "root", {
          get() {
            return self2.root;
          }
        });
        let map = new MapGenerator(str, void 0, this._opts, css);
        if (map.isMap()) {
          let [generatedCSS, generatedMap] = map.generate();
          if (generatedCSS) {
            this.result.css = generatedCSS;
          }
          if (generatedMap) {
            this.result.map = generatedMap;
          }
        } else {
          map.clearAnnotation();
          this.result.css = map.css;
        }
      }
      async() {
        if (this.error) return Promise.reject(this.error);
        return Promise.resolve(this.result);
      }
      catch(onRejected) {
        return this.async().catch(onRejected);
      }
      finally(onFinally) {
        return this.async().finally(onFinally);
      }
      sync() {
        if (this.error) throw this.error;
        return this.result;
      }
      then(onFulfilled, onRejected) {
        if (process.env.NODE_ENV !== "production") {
          if (!("from" in this._opts)) {
            warnOnce(
              "Without `from` option PostCSS could generate wrong source map and will not find Browserslist config. Set it to CSS file path or to `undefined` to prevent this warning."
            );
          }
        }
        return this.async().then(onFulfilled, onRejected);
      }
      toString() {
        return this._css;
      }
      warnings() {
        return [];
      }
    };
    module.exports = NoWorkResult;
    NoWorkResult.default = NoWorkResult;
  }
});

// node_modules/postcss/lib/processor.js
var require_processor = __commonJS({
  "node_modules/postcss/lib/processor.js"(exports, module) {
    "use strict";
    var Document2 = require_document();
    var LazyResult = require_lazy_result();
    var NoWorkResult = require_no_work_result();
    var Root2 = require_root();
    var Processor = class {
      constructor(plugins = []) {
        this.version = "8.5.33";
        this.plugins = this.normalize(plugins);
      }
      normalize(plugins) {
        let normalized = [];
        for (let i of plugins) {
          if (i.postcss === true) {
            i = i();
          } else if (i.postcss) {
            i = i.postcss;
          }
          if (typeof i === "object" && Array.isArray(i.plugins)) {
            normalized = normalized.concat(i.plugins);
          } else if (typeof i === "object" && i.postcssPlugin) {
            normalized.push(i);
          } else if (typeof i === "function") {
            normalized.push(i);
          } else if (typeof i === "object" && (i.parse || i.stringify)) {
            if (process.env.NODE_ENV !== "production") {
              throw new Error(
                "PostCSS syntaxes cannot be used as plugins. Instead, please use one of the syntax/parser/stringifier options as outlined in your PostCSS runner documentation."
              );
            }
          } else {
            throw new Error(i + " is not a PostCSS plugin");
          }
        }
        return normalized;
      }
      process(css, opts = {}) {
        if (!this.plugins.length && !opts.parser && !opts.stringifier && !opts.syntax) {
          return new NoWorkResult(this, css, opts);
        } else {
          return new LazyResult(this, css, opts);
        }
      }
      use(plugin) {
        this.plugins = this.plugins.concat(this.normalize([plugin]));
        return this;
      }
    };
    module.exports = Processor;
    Processor.default = Processor;
    Root2.registerProcessor(Processor);
    Document2.registerProcessor(Processor);
  }
});

// node_modules/postcss/lib/postcss.js
var require_postcss = __commonJS({
  "node_modules/postcss/lib/postcss.js"(exports, module) {
    "use strict";
    var AtRule = require_at_rule();
    var Comment3 = require_comment();
    var Container = require_container();
    var CssSyntaxError = require_css_syntax_error();
    var Declaration = require_declaration();
    var Document2 = require_document();
    var fromJSON = require_fromJSON();
    var Input = require_input();
    var LazyResult = require_lazy_result();
    var list = require_list();
    var Node2 = require_node();
    var parse = require_parse();
    var Processor = require_processor();
    var Result = require_result();
    var Root2 = require_root();
    var Rule = require_rule();
    var stringify = require_stringify();
    var Warning = require_warning();
    function postcss(...plugins) {
      if (plugins.length === 1 && Array.isArray(plugins[0])) {
        plugins = plugins[0];
      }
      return new Processor(plugins);
    }
    postcss.plugin = function plugin(name, initializer) {
      let warningPrinted = false;
      function creator(...args) {
        if (console && console.warn && !warningPrinted) {
          warningPrinted = true;
          console.warn(
            name + ": postcss.plugin was deprecated. Migration guide:\nhttps://evilmartians.com/chronicles/postcss-8-plugin-migration"
          );
          if (process.env.LANG && process.env.LANG.startsWith("zh")) {
            console.warn(
              name + ": \u91CC\u9762 postcss.plugin \u88AB\u5F03\u7528. \u8FC1\u79FB\u6307\u5357:\nhttps://www.w3ctech.com/topic/2226"
            );
          }
        }
        let transformer = initializer(...args);
        transformer.postcssPlugin = name;
        transformer.postcssVersion = new Processor().version;
        return transformer;
      }
      let cache;
      Object.defineProperty(creator, "postcss", {
        get() {
          if (!cache) cache = creator();
          return cache;
        }
      });
      creator.process = function(css, processOpts, pluginOpts) {
        return postcss([creator(pluginOpts)]).process(css, processOpts);
      };
      return creator;
    };
    postcss.stringify = stringify;
    postcss.parse = parse;
    postcss.fromJSON = fromJSON;
    postcss.list = list;
    postcss.comment = (defaults) => new Comment3(defaults);
    postcss.atRule = (defaults) => new AtRule(defaults);
    postcss.decl = (defaults) => new Declaration(defaults);
    postcss.rule = (defaults) => new Rule(defaults);
    postcss.root = (defaults) => new Root2(defaults);
    postcss.document = (defaults) => new Document2(defaults);
    postcss.CssSyntaxError = CssSyntaxError;
    postcss.Declaration = Declaration;
    postcss.Container = Container;
    postcss.Processor = Processor;
    postcss.Document = Document2;
    postcss.Comment = Comment3;
    postcss.Warning = Warning;
    postcss.AtRule = AtRule;
    postcss.Result = Result;
    postcss.Input = Input;
    postcss.Rule = Rule;
    postcss.Root = Root2;
    postcss.Node = Node2;
    LazyResult.registerPostcss(postcss);
    module.exports = postcss;
    postcss.default = postcss;
  }
});

// node_modules/dayjs/dayjs.min.js
var require_dayjs_min = __commonJS({
  "node_modules/dayjs/dayjs.min.js"(exports, module) {
    !(function(t, e) {
      "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : (t = "undefined" != typeof globalThis ? globalThis : t || self).dayjs = e();
    })(exports, (function() {
      "use strict";
      var t = 1e3, e = 6e4, n = 36e5, r = "millisecond", i = "second", s = "minute", u = "hour", a = "day", o = "week", c = "month", f = "quarter", h = "year", d = "date", l = "Invalid Date", $ = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/, y = /\[([^\]]+)]|YYYY|YY|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g, M = { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"), ordinal: function(t2) {
        var e2 = ["th", "st", "nd", "rd"], n2 = t2 % 100;
        return "[" + t2 + (e2[(n2 - 20) % 10] || e2[n2] || e2[0]) + "]";
      } }, m = function(t2, e2, n2) {
        var r2 = String(t2);
        return !r2 || r2.length >= e2 ? t2 : "" + Array(e2 + 1 - r2.length).join(n2) + t2;
      }, v = { s: m, z: function(t2) {
        var e2 = -t2.utcOffset(), n2 = Math.abs(e2), r2 = Math.floor(n2 / 60), i2 = n2 % 60;
        return (e2 <= 0 ? "+" : "-") + m(r2, 2, "0") + ":" + m(i2, 2, "0");
      }, m: function t2(e2, n2) {
        if (e2.date() < n2.date()) return -t2(n2, e2);
        var r2 = 12 * (n2.year() - e2.year()) + (n2.month() - e2.month()), i2 = e2.clone().add(r2, c), s2 = n2 - i2 < 0, u2 = e2.clone().add(r2 + (s2 ? -1 : 1), c);
        return +(-(r2 + (n2 - i2) / (s2 ? i2 - u2 : u2 - i2)) || 0);
      }, a: function(t2) {
        return t2 < 0 ? Math.ceil(t2) || 0 : Math.floor(t2);
      }, p: function(t2) {
        return { M: c, y: h, w: o, d: a, D: d, h: u, m: s, s: i, ms: r, Q: f }[t2] || String(t2 || "").toLowerCase().replace(/s$/, "");
      }, u: function(t2) {
        return void 0 === t2;
      } }, g = "en", D = {};
      D[g] = M;
      var p = "$isDayjsObject", S = function(t2) {
        return t2 instanceof _ || !(!t2 || !t2[p]);
      }, w = function t2(e2, n2, r2) {
        var i2;
        if (!e2) return g;
        if ("string" == typeof e2) {
          var s2 = e2.toLowerCase();
          D[s2] && (i2 = s2), n2 && (D[s2] = n2, i2 = s2);
          var u2 = e2.split("-");
          if (!i2 && u2.length > 1) return t2(u2[0]);
        } else {
          var a2 = e2.name;
          D[a2] = e2, i2 = a2;
        }
        return !r2 && i2 && (g = i2), i2 || !r2 && g;
      }, O = function(t2, e2) {
        if (S(t2)) return t2.clone();
        var n2 = "object" == typeof e2 ? e2 : {};
        return n2.date = t2, n2.args = arguments, new _(n2);
      }, b = v;
      b.l = w, b.i = S, b.w = function(t2, e2) {
        return O(t2, { locale: e2.$L, utc: e2.$u, x: e2.$x, $offset: e2.$offset });
      };
      var _ = (function() {
        function M2(t2) {
          this.$L = w(t2.locale, null, true), this.parse(t2), this.$x = this.$x || t2.x || {}, this[p] = true;
        }
        var m2 = M2.prototype;
        return m2.parse = function(t2) {
          this.$d = (function(t3) {
            var e2 = t3.date, n2 = t3.utc;
            if (null === e2) return /* @__PURE__ */ new Date(NaN);
            if (b.u(e2)) return /* @__PURE__ */ new Date();
            if (e2 instanceof Date) return new Date(e2);
            if ("string" == typeof e2 && !/Z$/i.test(e2)) {
              var r2 = e2.match($);
              if (r2) {
                var i2 = r2[2] - 1 || 0, s2 = (r2[7] || "0").substring(0, 3);
                return n2 ? new Date(Date.UTC(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2)) : new Date(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2);
              }
            }
            return new Date(e2);
          })(t2), this.init();
        }, m2.init = function() {
          var t2 = this.$d;
          this.$y = t2.getFullYear(), this.$M = t2.getMonth(), this.$D = t2.getDate(), this.$W = t2.getDay(), this.$H = t2.getHours(), this.$m = t2.getMinutes(), this.$s = t2.getSeconds(), this.$ms = t2.getMilliseconds();
        }, m2.$utils = function() {
          return b;
        }, m2.isValid = function() {
          return !(this.$d.toString() === l);
        }, m2.isSame = function(t2, e2) {
          var n2 = O(t2);
          return this.startOf(e2) <= n2 && n2 <= this.endOf(e2);
        }, m2.isAfter = function(t2, e2) {
          return O(t2) < this.startOf(e2);
        }, m2.isBefore = function(t2, e2) {
          return this.endOf(e2) < O(t2);
        }, m2.$g = function(t2, e2, n2) {
          return b.u(t2) ? this[e2] : this.set(n2, t2);
        }, m2.unix = function() {
          return Math.floor(this.valueOf() / 1e3);
        }, m2.valueOf = function() {
          return this.$d.getTime();
        }, m2.startOf = function(t2, e2) {
          var n2 = this, r2 = !!b.u(e2) || e2, f2 = b.p(t2), l2 = function(t3, e3) {
            var i2 = b.w(n2.$u ? Date.UTC(n2.$y, e3, t3) : new Date(n2.$y, e3, t3), n2);
            return r2 ? i2 : i2.endOf(a);
          }, $2 = function(t3, e3) {
            return b.w(n2.toDate()[t3].apply(n2.toDate("s"), (r2 ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(e3)), n2);
          }, y2 = this.$W, M3 = this.$M, m3 = this.$D, v2 = "set" + (this.$u ? "UTC" : "");
          switch (f2) {
            case h:
              return r2 ? l2(1, 0) : l2(31, 11);
            case c:
              return r2 ? l2(1, M3) : l2(0, M3 + 1);
            case o:
              var g2 = this.$locale().weekStart || 0, D2 = (y2 < g2 ? y2 + 7 : y2) - g2;
              return l2(r2 ? m3 - D2 : m3 + (6 - D2), M3);
            case a:
            case d:
              return $2(v2 + "Hours", 0);
            case u:
              return $2(v2 + "Minutes", 1);
            case s:
              return $2(v2 + "Seconds", 2);
            case i:
              return $2(v2 + "Milliseconds", 3);
            default:
              return this.clone();
          }
        }, m2.endOf = function(t2) {
          return this.startOf(t2, false);
        }, m2.$set = function(t2, e2) {
          var n2, o2 = b.p(t2), f2 = "set" + (this.$u ? "UTC" : ""), l2 = (n2 = {}, n2[a] = f2 + "Date", n2[d] = f2 + "Date", n2[c] = f2 + "Month", n2[h] = f2 + "FullYear", n2[u] = f2 + "Hours", n2[s] = f2 + "Minutes", n2[i] = f2 + "Seconds", n2[r] = f2 + "Milliseconds", n2)[o2], $2 = o2 === a ? this.$D + (e2 - this.$W) : e2;
          if (o2 === c || o2 === h) {
            var y2 = this.clone().set(d, 1);
            y2.$d[l2]($2), y2.init(), this.$d = y2.set(d, Math.min(this.$D, y2.daysInMonth())).$d;
          } else l2 && this.$d[l2]($2);
          return this.init(), this;
        }, m2.set = function(t2, e2) {
          return this.clone().$set(t2, e2);
        }, m2.get = function(t2) {
          return this[b.p(t2)]();
        }, m2.add = function(r2, f2) {
          var d2, l2 = this;
          r2 = Number(r2);
          var $2 = b.p(f2), y2 = function(t2) {
            var e2 = O(l2);
            return b.w(e2.date(e2.date() + Math.round(t2 * r2)), l2);
          };
          if ($2 === c) return this.set(c, this.$M + r2);
          if ($2 === h) return this.set(h, this.$y + r2);
          if ($2 === a) return y2(1);
          if ($2 === o) return y2(7);
          var M3 = (d2 = {}, d2[s] = e, d2[u] = n, d2[i] = t, d2)[$2] || 1, m3 = this.$d.getTime() + r2 * M3;
          return b.w(m3, this);
        }, m2.subtract = function(t2, e2) {
          return this.add(-1 * t2, e2);
        }, m2.format = function(t2) {
          var e2 = this, n2 = this.$locale();
          if (!this.isValid()) return n2.invalidDate || l;
          var r2 = t2 || "YYYY-MM-DDTHH:mm:ssZ", i2 = b.z(this), s2 = this.$H, u2 = this.$m, a2 = this.$M, o2 = n2.weekdays, c2 = n2.months, f2 = n2.meridiem, h2 = function(t3, n3, i3, s3) {
            return t3 && (t3[n3] || t3(e2, r2)) || i3[n3].slice(0, s3);
          }, d2 = function(t3) {
            return b.s(s2 % 12 || 12, t3, "0");
          }, $2 = f2 || function(t3, e3, n3) {
            var r3 = t3 < 12 ? "AM" : "PM";
            return n3 ? r3.toLowerCase() : r3;
          };
          return r2.replace(y, (function(t3, r3) {
            return r3 || (function(t4) {
              switch (t4) {
                case "YY":
                  return String(e2.$y).slice(-2);
                case "YYYY":
                  return b.s(e2.$y, 4, "0");
                case "M":
                  return a2 + 1;
                case "MM":
                  return b.s(a2 + 1, 2, "0");
                case "MMM":
                  return h2(n2.monthsShort, a2, c2, 3);
                case "MMMM":
                  return h2(c2, a2);
                case "D":
                  return e2.$D;
                case "DD":
                  return b.s(e2.$D, 2, "0");
                case "d":
                  return String(e2.$W);
                case "dd":
                  return h2(n2.weekdaysMin, e2.$W, o2, 2);
                case "ddd":
                  return h2(n2.weekdaysShort, e2.$W, o2, 3);
                case "dddd":
                  return o2[e2.$W];
                case "H":
                  return String(s2);
                case "HH":
                  return b.s(s2, 2, "0");
                case "h":
                  return d2(1);
                case "hh":
                  return d2(2);
                case "a":
                  return $2(s2, u2, true);
                case "A":
                  return $2(s2, u2, false);
                case "m":
                  return String(u2);
                case "mm":
                  return b.s(u2, 2, "0");
                case "s":
                  return String(e2.$s);
                case "ss":
                  return b.s(e2.$s, 2, "0");
                case "SSS":
                  return b.s(e2.$ms, 3, "0");
                case "Z":
                  return i2;
              }
              return null;
            })(t3) || i2.replace(":", "");
          }));
        }, m2.utcOffset = function() {
          return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
        }, m2.diff = function(r2, d2, l2) {
          var $2, y2 = this, M3 = b.p(d2), m3 = O(r2), v2 = (m3.utcOffset() - this.utcOffset()) * e, g2 = this - m3, D2 = function() {
            return b.m(y2, m3);
          };
          switch (M3) {
            case h:
              $2 = D2() / 12;
              break;
            case c:
              $2 = D2();
              break;
            case f:
              $2 = D2() / 3;
              break;
            case o:
              $2 = (g2 - v2) / 6048e5;
              break;
            case a:
              $2 = (g2 - v2) / 864e5;
              break;
            case u:
              $2 = g2 / n;
              break;
            case s:
              $2 = g2 / e;
              break;
            case i:
              $2 = g2 / t;
              break;
            default:
              $2 = g2;
          }
          return l2 ? $2 : b.a($2);
        }, m2.daysInMonth = function() {
          return this.endOf(c).$D;
        }, m2.$locale = function() {
          return D[this.$L];
        }, m2.locale = function(t2, e2) {
          if (!t2) return this.$L;
          var n2 = this.clone(), r2 = w(t2, e2, true);
          return r2 && (n2.$L = r2), n2;
        }, m2.clone = function() {
          return b.w(this.$d, this);
        }, m2.toDate = function() {
          return new Date(this.valueOf());
        }, m2.toJSON = function() {
          return this.isValid() ? this.toISOString() : null;
        }, m2.toISOString = function() {
          return this.$d.toISOString();
        }, m2.toString = function() {
          return this.$d.toUTCString();
        }, M2;
      })(), Y = _.prototype;
      return O.prototype = Y, [["$ms", r], ["$s", i], ["$m", s], ["$H", u], ["$W", a], ["$M", c], ["$y", h], ["$D", d]].forEach((function(t2) {
        Y[t2[1]] = function(e2) {
          return this.$g(e2, t2[0], t2[1]);
        };
      })), O.extend = function(t2, e2) {
        return t2.$i || (t2(e2, _, O), t2.$i = true), O;
      }, O.locale = w, O.isDayjs = S, O.unix = function(t2) {
        return O(1e3 * t2);
      }, O.en = D[g], O.Ls = D, O.p = {}, O;
    }));
  }
});

// node_modules/launder/index.js
var require_launder = __commonJS({
  "node_modules/launder/index.js"(exports, module) {
    var dayjs = require_dayjs_min();
    function cleanHref(href) {
      href = href.replace(/[\x00-\x20]+/g, "");
      while (true) {
        const firstIndex = href.indexOf("<!--");
        if (firstIndex === -1) {
          break;
        }
        const lastIndex = href.indexOf("-->", firstIndex + 4);
        if (lastIndex === -1) {
          break;
        }
        href = href.substring(0, firstIndex) + href.substring(lastIndex + 3);
      }
      return href;
    }
    function naughtyHref(href, options) {
      options = options || {};
      const allowedSchemes = options.allowedSchemes || ["http", "https", "ftp", "mailto", "tel", "sms"];
      const allowProtocolRelative = options.allowProtocolRelative !== false;
      if (typeof href !== "string") {
        return false;
      }
      href = cleanHref(href);
      const matches = href.match(/^([a-zA-Z][a-zA-Z0-9.\-+]*):/);
      if (!matches) {
        if (href.match(/^[/\\]{2}/)) {
          return !allowProtocolRelative;
        }
        return false;
      }
      const scheme = matches[1].toLowerCase();
      return allowedSchemes.indexOf(scheme) === -1;
    }
    module.exports = function(options) {
      const self2 = {};
      self2.options = options || {};
      self2.filterTag = self2.options.filterTag || function(tag) {
        tag = tag.trim();
        return tag.toLowerCase();
      };
      self2.string = function(s, def) {
        if (typeof s !== "string") {
          if (typeof s === "number" || typeof s === "boolean") {
            s += "";
          } else {
            s = "";
          }
        }
        s = s.trim();
        if (def !== void 0) {
          if (s === "") {
            s = def;
          }
        }
        return s;
      };
      self2.strings = function(strings) {
        if (!Array.isArray(strings)) {
          return [];
        }
        return strings.map(function(s) {
          return self2.string(s);
        });
      };
      self2.integer = function(i, def, min, max) {
        if (def === void 0) {
          def = 0;
        }
        if (typeof i === "number") {
          i = Math.floor(i);
        } else {
          try {
            i = parseInt(i, 10);
            if (isNaN(i)) {
              i = def;
            }
          } catch (e) {
            i = def;
          }
        }
        if (typeof min === "number" && i < min) {
          i = min;
        }
        if (typeof max === "number" && i > max) {
          i = max;
        }
        return i;
      };
      self2.padInteger = function(i, places) {
        let s = i + "";
        while (s.length < places) {
          s = "0" + s;
        }
        return s;
      };
      self2.float = function(i, def, min, max) {
        if (def === void 0) {
          def = 0;
        }
        if (!(typeof i === "number")) {
          try {
            i = parseFloat(i, 10);
            if (isNaN(i)) {
              i = def;
            }
          } catch (e) {
            i = def;
          }
        }
        if (typeof min === "number" && i < min) {
          i = min;
        }
        if (typeof max === "number" && i > max) {
          i = max;
        }
        return i;
      };
      self2.naughtyHref = naughtyHref;
      self2.url = function(s, def, httpsFix) {
        s = self2.string(s, def);
        if (s === def) {
          return s;
        }
        s = cleanHref(s);
        if (naughtyHref(s)) {
          return def;
        }
        s = fixUrl(s);
        if (s === null) {
          return def;
        }
        return s;
        function fixUrl(href) {
          if (href.match(/^(((https?|ftp):\/\/)|((mailto|tel|sms):)|#|([^/.]+)?\/|[^/.]+$)/)) {
            return href;
          } else if (href.match(/^[^/.]+\.[^/.]+/)) {
            const protocol = httpsFix ? "https://" : "http://";
            return protocol + href;
          } else {
            return null;
          }
        }
        ;
      };
      self2.select = function(s, choices, def) {
        s = self2.string(s);
        if (!choices || !choices.length) {
          return def;
        }
        let choice;
        if (typeof choices[0] === "object") {
          choice = choices.find(function(choice2) {
            if (choice2.value === null || choice2.value === void 0) {
              return false;
            }
            return choice2.value.toString() === s;
          });
          if (choice != null) {
            return choice.value;
          }
          return def;
        }
        choice = choices.find(function(choice2) {
          if (choice2 === null || choice2 === void 0) {
            return false;
          }
          return choice2.toString() === s;
        });
        if (choice !== void 0) {
          return choice;
        }
        return def;
      };
      self2.boolean = function(b, def) {
        if (b === true) {
          return true;
        }
        if (b === false) {
          return false;
        }
        b = self2.string(b, def);
        if (b === def) {
          if (b === void 0) {
            return false;
          }
          return b;
        }
        b = b.toLowerCase().charAt(0);
        if (b === "" || b === "n" || b === "0" || b === "f") {
          return false;
        }
        if (b === "t" || b === "y" || b === "1") {
          return true;
        }
        return false;
      };
      self2.addBooleanFilterToCriteria = function(options2, name, criteria, def) {
        if (def === void 0) {
          def = null;
        }
        let value = typeof options2 === "object" && options2 !== null ? options2[name] : options2;
        value = value === void 0 ? def : value;
        value = self2.booleanOrNull(value);
        if (value === null) {
        } else if (!value) {
          criteria[name] = { $ne: true };
        } else {
          criteria[name] = true;
        }
      };
      self2.booleanOrNull = function(b, def) {
        if (b === true) {
          return b;
        }
        if (b === false) {
          return b;
        }
        if (b === null) {
          return b;
        }
        b = self2.string(b, def);
        if (b === def) {
          if (def === void 0) {
            return null;
          }
          return b;
        }
        if (b === "null") {
          return null;
        }
        b = b.toLowerCase().charAt(0);
        if (b === "" || b === "n" || b === "0" || b === "f") {
          return false;
        }
        if (b === "t" || b === "y" || b === "1") {
          return true;
        }
        if (b === "a") {
          return null;
        }
        return def;
      };
      self2.date = function(date, def, now) {
        let components;
        function returnDefault() {
          if (def === void 0) {
            def = dayjs().format("YYYY-MM-DD");
          }
          return def;
        }
        if (typeof date === "string") {
          if (date.match(/\//)) {
            components = date.split("/");
            if (components.length === 2) {
              return (now || /* @__PURE__ */ new Date()).getFullYear() + "-" + self2.padInteger(components[0], 2) + "-" + self2.padInteger(components[1], 2);
            } else if (components.length === 3) {
              if (components[2] < 100) {
                const d = now || /* @__PURE__ */ new Date();
                const nowYear = d.getFullYear() % 100;
                const nowCentury = d.getFullYear() - nowYear;
                let theirYear = parseInt(components[2]) + nowCentury;
                if (theirYear - d.getFullYear() > 50) {
                  theirYear -= 100;
                }
                components[2] = theirYear;
              }
              return self2.padInteger(components[2], 4) + "-" + self2.padInteger(components[0], 2) + "-" + self2.padInteger(components[1], 2);
            } else {
              return returnDefault();
            }
          } else if (date.match(/-/)) {
            components = date.split("-");
            if (components.length === 2) {
              return (now || /* @__PURE__ */ new Date()).getFullYear() + "-" + self2.padInteger(components[0], 2) + "-" + self2.padInteger(components[1], 2);
            } else if (components.length === 3) {
              return self2.padInteger(components[0], 4) + "-" + self2.padInteger(components[1], 2) + "-" + self2.padInteger(components[2], 2);
            } else {
              return returnDefault();
            }
          }
        }
        try {
          if (date === null) {
            return returnDefault();
          }
          date = now || new Date(date);
          if (isNaN(date.getTime())) {
            return returnDefault();
          }
          return date.getFullYear() + "-" + self2.padInteger(date.getMonth() + 1, 2) + "-" + self2.padInteger(date.getDate(), 2);
        } catch (e) {
          return returnDefault();
        }
      };
      self2.formatDate = function(date) {
        return dayjs(date).format("YYYY-MM-DD");
      };
      self2.time = function(time, def) {
        time = self2.string(time).toLowerCase();
        time = time.trim();
        const components = time.match(/^(\d+)([:|.](\d+))?([:|.](\d+))?\s*(am|pm|AM|PM|a|p|A|M)?$/);
        if (components) {
          let hours = parseInt(components[1], 10);
          const minutes = components[3] !== void 0 ? parseInt(components[3], 10) : 0;
          const seconds = components[5] !== void 0 ? parseInt(components[5], 10) : 0;
          let ampm = components[6] ? components[6].toLowerCase() : components[6];
          ampm = ampm && ampm.charAt(0);
          if (hours === 12 && ampm === "a") {
            hours -= 12;
          } else if (hours === 12 && ampm === "p") {
          } else if (ampm === "p") {
            hours += 12;
          }
          if (hours === 24 || hours === "24") {
            hours = 0;
          }
          return self2.padInteger(hours, 2) + ":" + self2.padInteger(minutes, 2) + ":" + self2.padInteger(seconds, 2);
        } else {
          if (def !== void 0) {
            return def;
          }
          return dayjs().format("HH:mm");
        }
      };
      self2.formatTime = function(date) {
        return dayjs(date).format("HH:mm:ss");
      };
      self2.tags = function(tags, filter2) {
        if (typeof tags === "string") {
          tags = tags.split(/,\s*/);
        }
        if (!Array.isArray(tags)) {
          return [];
        }
        const strings = tags.map((tag) => self2.string(tag));
        const rewritten = strings.map(filter2 || self2.filterTag);
        const filtered = rewritten.filter((tag) => tag.length > 0);
        return filtered;
      };
      self2.idRegExp = self2.options.idRegExp || /^[A-Za-z0-9_]+$/;
      self2.id = function(s, def) {
        const id = self2.string(s, def);
        if (id === def) {
          return id;
        }
        if (!id.match(self2.idRegExp)) {
          return def;
        }
        return id;
      };
      self2.ids = function(ids) {
        if (!Array.isArray(ids)) {
          return [];
        }
        const result = ids.filter(function(id) {
          return self2.id(id) !== void 0;
        });
        return result;
      };
      return self2;
    };
    module.exports.naughtyHref = naughtyHref;
  }
});

// node_modules/sanitize-html/index.js
var require_sanitize_html = __commonJS({
  "node_modules/sanitize-html/index.js"(exports, module) {
    var htmlparser = (init_dist6(), __toCommonJS(dist_exports3));
    var escapeStringRegexp = require_escape_string_regexp();
    var { isPlainObject } = require_is_plain_object();
    var parseSrcset = require_parse_srcset();
    var { parse: postcssParse } = require_postcss();
    var { naughtyHref: launderNaughtyHref } = require_launder();
    var mediaTags = [
      "img",
      "audio",
      "video",
      "picture",
      "svg",
      "object",
      "map",
      "iframe",
      "embed"
    ];
    var vulnerableTags = ["script", "style"];
    var svgAnimationTags = [
      "animate",
      "animatecolor",
      "animatemotion",
      "animatetransform",
      "set"
    ];
    var alwaysUrlAttributes = ["href"];
    var severities = ["debug", "info", "warn", "error"];
    function loggerFor(options) {
      const source = options && options.logger || console;
      const logger = {};
      for (const severity of severities) {
        logger[severity] = typeof source[severity] === "function" ? (...args) => source[severity](...args) : (...args) => console[severity](...args);
      }
      return logger;
    }
    function each(obj, cb) {
      if (obj) {
        Object.keys(obj).forEach(function(key) {
          cb(obj[key], key);
        });
      }
    }
    function has(obj, key) {
      return {}.hasOwnProperty.call(obj, key);
    }
    function mergeClasses(specific, wildcard) {
      if (!Array.isArray(specific) || !Array.isArray(wildcard)) {
        return wildcard;
      }
      return specific.concat(wildcard);
    }
    function mergeStyles(specific, wildcard) {
      const merged = /* @__PURE__ */ Object.create(null);
      for (const rules of [specific, wildcard]) {
        for (const prop of Object.keys(rules)) {
          merged[prop] = has(merged, prop) ? merged[prop].concat(rules[prop]) : rules[prop];
        }
      }
      return merged;
    }
    function filter2(a, cb) {
      const n = [];
      each(a, function(v) {
        if (cb(v)) {
          n.push(v);
        }
      });
      return n;
    }
    function isEmptyObject(obj) {
      for (const key in obj) {
        if (has(obj, key)) {
          return false;
        }
      }
      return true;
    }
    function stringifySrcset(parsedSrcset) {
      return parsedSrcset.map(function(part) {
        if (!part.url) {
          throw new Error("URL missing");
        }
        return part.url + (part.w ? ` ${part.w}w` : "") + (part.h ? ` ${part.h}h` : "") + (part.d ? ` ${part.d}x` : "");
      }).join(", ");
    }
    module.exports = sanitizeHtml2;
    var VALID_HTML_ATTRIBUTE_NAME = /^[^\0\t\n\f\r /<=>]+$/;
    var MAX_IFRAME_FALLBACK_DEPTH = 8;
    function sanitizeHtml2(html, options, _fallback) {
      if (html == null) {
        return "";
      }
      const baseDepth = _fallback && _fallback.depth || 0;
      const iframeFallbackDepth = _fallback && _fallback.iframeFallbackDepth || 0;
      if (typeof html === "number") {
        html = html.toString();
      }
      let result = "";
      let tempResult = "";
      function Frame(tag, attribs) {
        const that = this;
        this.tag = tag;
        this.attribs = attribs || {};
        this.tagPosition = result.length;
        this.text = "";
        this.openingTagLength = 0;
        this.mediaChildren = [];
        this.updateParentNodeText = function() {
          if (stack.length) {
            const parentFrame = stack[stack.length - 1];
            parentFrame.text += that.text;
          }
        };
        this.updateParentNodeMediaChildren = function() {
          if (stack.length && mediaTags.includes(this.tag)) {
            const parentFrame = stack[stack.length - 1];
            parentFrame.mediaChildren.push(this.tag);
          }
        };
      }
      options = Object.assign({}, sanitizeHtml2.defaults, options);
      options.parser = Object.assign({}, htmlParserDefaults, options.parser);
      if (typeof html === "string" && !options.parser.xmlMode) {
        html = html.replaceAll("<![CDATA[", "<!&#91;CDATA[");
      }
      const logger = loggerFor(options);
      const tagAllowed = function(name) {
        return options.allowedTags === false || (options.allowedTags || []).indexOf(name) > -1;
      };
      vulnerableTags.forEach(function(tag) {
        if (tagAllowed(tag) && !options.allowVulnerableTags) {
          logger.warn(
            `Your \`allowedTags\` option includes \`${tag}\`, which is inherently vulnerable to XSS attacks. Please remove it from \`allowedTags\`, or, to disable this warning, add the \`allowVulnerableTags\` option and ensure you are accounting for this risk.`
          );
        }
      });
      const nonTextTagsArray = options.nonTextTags || [
        "script",
        "style",
        "textarea",
        "option",
        "xmp"
      ];
      let allowedAttributesMap;
      let allowedAttributesGlobMap;
      if (options.allowedAttributes) {
        allowedAttributesMap = {};
        allowedAttributesGlobMap = {};
        each(options.allowedAttributes, function(attributes, tag) {
          allowedAttributesMap[tag] = [];
          const globRegex = [];
          attributes.forEach(function(obj) {
            if (typeof obj === "string" && obj.indexOf("*") >= 0) {
              globRegex.push(escapeStringRegexp(obj).replace(/\\\*/g, ".*"));
            } else {
              allowedAttributesMap[tag].push(obj);
            }
          });
          if (globRegex.length) {
            allowedAttributesGlobMap[tag] = new RegExp("^(" + globRegex.join("|") + ")$");
          }
        });
      }
      const allowedClassesMap = {};
      const allowedClassesGlobMap = {};
      const allowedClassesRegexMap = {};
      each(options.allowedClasses, function(classes, tag) {
        if (allowedAttributesMap) {
          if (!has(allowedAttributesMap, tag)) {
            allowedAttributesMap[tag] = [];
          }
          allowedAttributesMap[tag].push("class");
        }
        allowedClassesMap[tag] = classes;
        if (Array.isArray(classes)) {
          const globRegex = [];
          allowedClassesMap[tag] = [];
          allowedClassesRegexMap[tag] = [];
          classes.forEach(function(obj) {
            if (typeof obj === "string" && obj.indexOf("*") >= 0) {
              globRegex.push(escapeStringRegexp(obj).replace(/\\\*/g, ".*"));
            } else if (obj instanceof RegExp) {
              allowedClassesRegexMap[tag].push(obj);
            } else {
              allowedClassesMap[tag].push(obj);
            }
          });
          if (globRegex.length) {
            allowedClassesGlobMap[tag] = new RegExp("^(" + globRegex.join("|") + ")$");
          }
        }
      });
      const transformTagsMap = {};
      let transformTagsAll;
      each(options.transformTags, function(transform, tag) {
        let transFun;
        if (typeof transform === "function") {
          transFun = transform;
        } else if (typeof transform === "string") {
          transFun = sanitizeHtml2.simpleTransform(transform);
        }
        if (tag === "*") {
          transformTagsAll = transFun;
        } else {
          transformTagsMap[tag] = transFun;
        }
      });
      let depth;
      let stack;
      let skipMap;
      let transformMap;
      let skipText;
      let skipTextDepth;
      let rawTextEnd;
      let skipRawText;
      let addedText = false;
      initializeState();
      const parser = new htmlparser.Parser({
        onopentag: function(name, attribs) {
          if (options.onOpenTag) {
            options.onOpenTag(name, attribs);
          }
          updateRawTextRegion();
          if (options.enforceHtmlBoundary && name === "html") {
            initializeState();
          }
          if (skipRawText) {
            return;
          }
          if (skipText) {
            skipTextDepth++;
            return;
          }
          const frame = new Frame(name, attribs);
          stack.push(frame);
          let skip = false;
          const hasText = !!frame.text;
          let transformedTag;
          if (has(transformTagsMap, name)) {
            transformedTag = transformTagsMap[name](name, attribs);
            frame.attribs = attribs = transformedTag.attribs;
            if (transformedTag.text !== void 0) {
              frame.innerText = transformedTag.text;
            }
            if (name !== transformedTag.tagName) {
              frame.name = name = transformedTag.tagName;
              transformMap[depth] = transformedTag.tagName;
            }
          }
          if (transformTagsAll) {
            transformedTag = transformTagsAll(name, attribs);
            frame.attribs = attribs = transformedTag.attribs;
            if (name !== transformedTag.tagName) {
              frame.name = name = transformedTag.tagName;
              transformMap[depth] = transformedTag.tagName;
            }
          }
          if (!tagAllowed(name) || animatesUrlAttribute(name, attribs) || options.disallowedTagsMode === "recursiveEscape" && !isEmptyObject(skipMap) || options.nestingLimit != null && depth >= options.nestingLimit) {
            skip = true;
            skipMap[depth] = true;
            if (options.disallowedTagsMode === "discard" || options.disallowedTagsMode === "completelyDiscard") {
              if (nonTextTagsArray.indexOf(name) !== -1) {
                skipText = true;
                skipTextDepth = 1;
                if (frame.tag.toLowerCase() === "noscript") {
                  rawTextEnd = findRawTextEnd("noscript", parser.endIndex + 1);
                }
              }
            }
          }
          depth++;
          if (skip) {
            if (options.disallowedTagsMode === "discard" || options.disallowedTagsMode === "completelyDiscard") {
              if (frame.innerText && !hasText) {
                const escaped = escapeHtml(frame.innerText);
                if (options.textFilter) {
                  result += options.textFilter(escaped, name);
                } else {
                  result += escaped;
                }
                addedText = true;
              }
              return;
            }
            tempResult = result;
            result = "";
          }
          result += "<" + name;
          if (name === "script") {
            if (options.allowedScriptHostnames || options.allowedScriptDomains) {
              frame.innerText = "";
            }
          }
          const isBeingEscaped = skip && (options.disallowedTagsMode === "escape" || options.disallowedTagsMode === "recursiveEscape");
          const shouldPreserveEscapedAttributes = isBeingEscaped && options.preserveEscapedAttributes;
          if (shouldPreserveEscapedAttributes) {
            each(attribs, function(value, a) {
              result += " " + a + '="' + escapeHtml(value || "", true) + '"';
            });
          } else if (!allowedAttributesMap || has(allowedAttributesMap, name) || allowedAttributesMap["*"]) {
            each(attribs, function(value, a) {
              if (!VALID_HTML_ATTRIBUTE_NAME.test(a)) {
                delete frame.attribs[a];
                return;
              }
              if (value === "" && !options.allowedEmptyAttributes.includes(a) && (options.nonBooleanAttributes.includes(a) || options.nonBooleanAttributes.includes("*"))) {
                delete frame.attribs[a];
                return;
              }
              let passedAllowedAttributesMapCheck = false;
              if (!allowedAttributesMap || has(allowedAttributesMap, name) && allowedAttributesMap[name].indexOf(a) !== -1 || allowedAttributesMap["*"] && allowedAttributesMap["*"].indexOf(a) !== -1 || has(allowedAttributesGlobMap, name) && allowedAttributesGlobMap[name].test(a) || allowedAttributesGlobMap["*"] && allowedAttributesGlobMap["*"].test(a)) {
                passedAllowedAttributesMapCheck = true;
              } else if (allowedAttributesMap && allowedAttributesMap[name]) {
                for (const o of allowedAttributesMap[name]) {
                  if (isPlainObject(o) && o.name && o.name === a) {
                    passedAllowedAttributesMapCheck = true;
                    let newValue = "";
                    if (o.multiple === true) {
                      const splitStrArray = value.split(" ");
                      for (const s of splitStrArray) {
                        if (o.values.indexOf(s) !== -1) {
                          if (newValue === "") {
                            newValue = s;
                          } else {
                            newValue += " " + s;
                          }
                        }
                      }
                    } else if (o.values.indexOf(value) >= 0) {
                      newValue = value;
                    }
                    value = newValue;
                  }
                }
              }
              if (passedAllowedAttributesMapCheck) {
                if (options.allowedSchemesAppliedToAttributes.indexOf(a) !== -1) {
                  if (naughtyHref(name, value)) {
                    delete frame.attribs[a];
                    return;
                  }
                }
                if (name === "meta" && a.toLowerCase() === "content" && isRefresh(attribs) && naughtyRefresh(value)) {
                  delete frame.attribs[a];
                  return;
                }
                if (name === "script" && a === "src") {
                  let allowed = true;
                  try {
                    const parsed = parseUrl(value);
                    if (options.allowedScriptHostnames || options.allowedScriptDomains) {
                      const allowedHostname = (options.allowedScriptHostnames || []).find(function(hostname) {
                        return hostname === parsed.url.hostname;
                      });
                      const allowedDomain = (options.allowedScriptDomains || []).find(function(domain) {
                        return parsed.url.hostname === domain || parsed.url.hostname.endsWith(`.${domain}`);
                      });
                      allowed = allowedHostname || allowedDomain;
                    }
                  } catch (e) {
                    allowed = false;
                  }
                  if (!allowed) {
                    delete frame.attribs[a];
                    return;
                  }
                }
                if (name === "iframe" && a === "src") {
                  let allowed = true;
                  try {
                    const parsed = parseUrl(value);
                    if (parsed.isRelativeUrl) {
                      allowed = has(options, "allowIframeRelativeUrls") ? options.allowIframeRelativeUrls : !options.allowedIframeHostnames && !options.allowedIframeDomains;
                    } else if (options.allowedIframeHostnames || options.allowedIframeDomains) {
                      const allowedHostname = (options.allowedIframeHostnames || []).find(function(hostname) {
                        return hostname === parsed.url.hostname;
                      });
                      const allowedDomain = (options.allowedIframeDomains || []).find(function(domain) {
                        return parsed.url.hostname === domain || parsed.url.hostname.endsWith(`.${domain}`);
                      });
                      allowed = allowedHostname || allowedDomain;
                    }
                  } catch (e) {
                    allowed = false;
                  }
                  if (!allowed) {
                    delete frame.attribs[a];
                    return;
                  }
                }
                if (a === "srcset" || a === "imagesrcset") {
                  try {
                    let parsed = parseSrcset(value);
                    parsed.forEach(function(value2) {
                      if (naughtyHref(name, value2.url)) {
                        value2.evil = true;
                      }
                    });
                    parsed = filter2(parsed, function(v) {
                      return !v.evil;
                    });
                    if (!parsed.length) {
                      delete frame.attribs[a];
                      return;
                    } else {
                      value = stringifySrcset(filter2(parsed, function(v) {
                        return !v.evil;
                      }));
                      frame.attribs[a] = value;
                    }
                  } catch (e) {
                    delete frame.attribs[a];
                    return;
                  }
                }
                if (a === "class") {
                  const allowedSpecificClasses = allowedClassesMap[name];
                  const allowedWildcardClasses = allowedClassesMap["*"];
                  const allowedSpecificClassesGlob = allowedClassesGlobMap[name];
                  const allowedSpecificClassesRegex = allowedClassesRegexMap[name];
                  const allowedWildcardClassesRegex = allowedClassesRegexMap["*"];
                  const allowedWildcardClassesGlob = allowedClassesGlobMap["*"];
                  const allowedClassesGlobs = [
                    allowedSpecificClassesGlob,
                    allowedWildcardClassesGlob
                  ].concat(allowedSpecificClassesRegex, allowedWildcardClassesRegex).filter(function(t) {
                    return t;
                  });
                  if (allowedSpecificClasses && allowedWildcardClasses) {
                    value = filterClasses(
                      value,
                      mergeClasses(allowedSpecificClasses, allowedWildcardClasses),
                      allowedClassesGlobs
                    );
                  } else {
                    value = filterClasses(
                      value,
                      allowedSpecificClasses || allowedWildcardClasses,
                      allowedClassesGlobs
                    );
                  }
                  if (!value.length) {
                    delete frame.attribs[a];
                    return;
                  }
                }
                if (a === "style") {
                  if (options.parseStyleAttributes) {
                    try {
                      const abstractSyntaxTree = postcssParse(name + " {" + value + "}", { map: false });
                      const filteredAST = filterCss(
                        abstractSyntaxTree,
                        options.allowedStyles
                      );
                      value = stringifyStyleAttributes(filteredAST);
                      if (value.length === 0) {
                        delete frame.attribs[a];
                        return;
                      }
                    } catch (e) {
                      if (typeof window !== "undefined") {
                        logger.warn(
                          `Failed to parse "${name} {${value}}". If you are running this in a browser, we recommend disabling style parsing with the parseStyleAttributes option, since it only works in a node environment due to a postcss dependency. More info: https://github.com/apostrophecms/sanitize-html/issues/547`
                        );
                      }
                      delete frame.attribs[a];
                      return;
                    }
                  } else if (options.allowedStyles) {
                    throw new Error("allowedStyles option cannot be used together with parseStyleAttributes: false.");
                  }
                }
                result += " " + a;
                if (value && value.length) {
                  result += '="' + escapeHtml(value, true) + '"';
                } else if (options.allowedEmptyAttributes.includes(a)) {
                  result += '=""';
                }
              } else {
                delete frame.attribs[a];
              }
            });
          }
          if (options.selfClosing.indexOf(name) !== -1) {
            result += " />";
          } else {
            result += ">";
            if (frame.innerText && !hasText) {
              const escaped = escapeHtml(frame.innerText);
              if (options.textFilter) {
                result += options.textFilter(escaped, name);
              } else {
                result += escaped;
              }
              addedText = true;
            }
          }
          if (skip) {
            result = tempResult + escapeHtml(result);
            tempResult = "";
          }
          frame.openingTagLength = result.length - frame.tagPosition;
        },
        ontext: function(text) {
          updateRawTextRegion();
          if (skipText || skipRawText) {
            return;
          }
          const lastFrame = stack[stack.length - 1];
          let tag;
          if (lastFrame) {
            tag = lastFrame.tag;
            text = lastFrame.innerText !== void 0 ? lastFrame.innerText : text;
          }
          if (options.disallowedTagsMode === "completelyDiscard" && !tagAllowed(tag)) {
            text = "";
          } else if (tag && tagAllowed(tag) && (options.disallowedTagsMode === "discard" || options.disallowedTagsMode === "completelyDiscard") && tag === "script") {
            result += text;
          } else if (tag && tagAllowed(tag) && (options.disallowedTagsMode === "discard" || options.disallowedTagsMode === "completelyDiscard") && tag === "style") {
            result += stack.some((frame) => [frame.tag, frame.name].some(
              (name) => name === "svg" || name === "math"
            )) ? text.replace(/</g, "\\3c ") : text;
          } else if (tag && tagAllowed(tag) && (options.disallowedTagsMode === "discard" || options.disallowedTagsMode === "completelyDiscard") && (tag === "textarea" || tag === "xmp")) {
            if (tag === "xmp") {
              result += text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            } else {
              result += escapeHtml(text, false);
            }
          } else if (
            // htmlparser2 treats <iframe> as a raw-text element, so markup inside
            // (including after an unclosed <iframe>) arrives as a single text node.
            // When the iframe is discarded, re-sanitize that fallback markup as HTML
            // instead of escaping it as plain text (issue #5550).
            // The nested call continues from the current depth so that
            // `nestingLimit` applies to the whole output.
            tag === "iframe" && !tagAllowed(tag) && options.disallowedTagsMode === "discard" && iframeFallbackDepth < MAX_IFRAME_FALLBACK_DEPTH
          ) {
            result += sanitizeHtml2(text, options, {
              depth,
              iframeFallbackDepth: iframeFallbackDepth + 1
            });
          } else if (!addedText) {
            const escaped = escapeHtml(text, false);
            if (options.textFilter) {
              result += options.textFilter(escaped, tag);
            } else {
              result += escaped;
            }
          }
          if (stack.length) {
            const frame = stack[stack.length - 1];
            frame.text += text;
          }
        },
        onclosetag: function(name, isImplied) {
          if (options.onCloseTag) {
            options.onCloseTag(name, isImplied);
          }
          updateRawTextRegion();
          if (skipRawText) {
            const lastFrame = stack[stack.length - 1];
            if (!lastFrame || lastFrame.tag !== name) {
              return;
            }
          } else if (skipText) {
            skipTextDepth--;
            if (!skipTextDepth) {
              skipText = false;
              if (rawTextEnd !== null) {
                skipRawText = true;
              }
            } else {
              return;
            }
          }
          const frame = stack.pop();
          if (!frame) {
            return;
          }
          if (frame.tag !== name) {
            stack.push(frame);
            return;
          }
          skipText = options.enforceHtmlBoundary ? name === "html" : false;
          depth--;
          const skip = skipMap[depth];
          if (skip) {
            delete skipMap[depth];
            if (options.disallowedTagsMode === "discard" || options.disallowedTagsMode === "completelyDiscard") {
              frame.updateParentNodeText();
              return;
            }
            tempResult = result;
            result = "";
          }
          if (transformMap[depth]) {
            name = transformMap[depth];
            delete transformMap[depth];
          }
          if (options.exclusiveFilter) {
            const filterResult = options.exclusiveFilter(frame);
            if (filterResult === "excludeTag") {
              if (skip) {
                result = tempResult;
                tempResult = "";
              }
              result = result.substring(0, frame.tagPosition) + result.substring(frame.tagPosition + frame.openingTagLength);
              return;
            } else if (filterResult) {
              result = result.substring(0, frame.tagPosition);
              return;
            }
          }
          frame.updateParentNodeMediaChildren();
          frame.updateParentNodeText();
          if (
            // Already output />
            options.selfClosing.indexOf(name) !== -1 || // Escaped tag, closing tag is implied
            isImplied && !tagAllowed(name) && ["escape", "recursiveEscape"].indexOf(options.disallowedTagsMode) >= 0
          ) {
            if (skip) {
              result = tempResult;
              tempResult = "";
            }
            return;
          }
          result += "</" + name + ">";
          if (skip) {
            result = tempResult + escapeHtml(result);
            tempResult = "";
          }
          addedText = false;
        }
      }, options.parser);
      parser.write(html);
      parser.end();
      if (options.disallowedTagsMode === "escape" || options.disallowedTagsMode === "recursiveEscape") {
        const lastParsedIndex = parser.endIndex;
        if (lastParsedIndex != null && lastParsedIndex >= 0 && lastParsedIndex < html.length) {
          const unparsed = html.substring(lastParsedIndex);
          result += escapeHtml(unparsed);
        } else if ((lastParsedIndex == null || lastParsedIndex < 0) && html.length > 0 && result === "") {
          result = escapeHtml(html);
        }
      }
      return result;
      function initializeState() {
        result = "";
        depth = baseDepth;
        stack = [];
        skipMap = {};
        transformMap = {};
        skipText = false;
        skipTextDepth = 0;
        rawTextEnd = null;
        skipRawText = false;
      }
      function updateRawTextRegion() {
        if (rawTextEnd !== null && parser.startIndex >= rawTextEnd) {
          rawTextEnd = null;
          skipRawText = false;
        }
      }
      function findRawTextEnd(tagName, from) {
        const re = new RegExp("</" + tagName + "[\\t\\n\\f\\r />]", "ig");
        re.lastIndex = from;
        const match = re.exec(html);
        return match ? match.index : Infinity;
      }
      function escapeHtml(s, quote) {
        if (typeof s !== "string") {
          s = s + "";
        }
        if (options.parser.decodeEntities) {
          s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          if (quote) {
            s = s.replace(/"/g, "&quot;");
          }
        }
        s = s.replace(/&(?![a-zA-Z0-9#]+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (quote) {
          s = s.replace(/"/g, "&quot;");
        }
        return s;
      }
      function naughtyHref(name, href) {
        const allowedSchemes = has(options.allowedSchemesByTag, name) ? options.allowedSchemesByTag[name] : options.allowedSchemes || [];
        return launderNaughtyHref(href, {
          allowedSchemes,
          allowProtocolRelative: options.allowProtocolRelative
        });
      }
      function isRefresh(attribs) {
        return Object.keys(attribs).some(function(a) {
          return a.toLowerCase() === "http-equiv" && String(attribs[a]).trim().toLowerCase() === "refresh";
        });
      }
      function naughtyRefresh(content) {
        const input = String(content);
        const isWhitespace2 = function(c) {
          return c === " " || c === "	" || c === "\n" || c === "\f" || c === "\r";
        };
        let position = 0;
        const skipWhitespace = function() {
          while (position < input.length && isWhitespace2(input[position])) {
            position++;
          }
        };
        const lowerAt = function(i) {
          return (input[i] || "").toLowerCase();
        };
        skipWhitespace();
        const timeStart = position;
        while (position < input.length && /[0-9.]/.test(input[position])) {
          position++;
        }
        if (position === timeStart) {
          return true;
        }
        if (position < input.length) {
          const c = input[position];
          if (c !== ";" && c !== "," && !isWhitespace2(c)) {
            return true;
          }
          skipWhitespace();
          if (input[position] === ";" || input[position] === ",") {
            position++;
          }
          skipWhitespace();
        }
        if (position >= input.length) {
          return false;
        }
        let url = input.slice(position);
        let quoted = true;
        if (lowerAt(position) === "u") {
          quoted = false;
          if (lowerAt(position + 1) === "r" && lowerAt(position + 2) === "l") {
            position += 3;
            skipWhitespace();
            if (input[position] === "=") {
              position++;
              skipWhitespace();
              quoted = true;
            }
          }
        }
        if (quoted) {
          const quote = input[position];
          if (quote === '"' || quote === "'") {
            position++;
          }
          url = input.slice(position);
          if (quote === '"' || quote === "'") {
            const end = url.indexOf(quote);
            if (end !== -1) {
              url = url.slice(0, end);
            }
          }
        }
        return naughtyHref("meta", url);
      }
      function animatesUrlAttribute(name, attribs) {
        if (!nameParts(name).some((part) => svgAnimationTags.includes(part))) {
          return false;
        }
        const schemeCheckedAttributes = options.allowedSchemesAppliedToAttributes || [];
        return Object.keys(attribs || {}).some(function(attributeName) {
          if (!nameParts(attributeName).includes("attributename")) {
            return false;
          }
          const target = (attribs[attributeName] || "").trim().toLowerCase();
          return schemeCheckedAttributes.includes(target) || nameParts(target).some((part) => alwaysUrlAttributes.includes(part) || schemeCheckedAttributes.includes(part));
        });
      }
      function nameParts(name) {
        return name.toLowerCase().split(":").map((part) => part.trim());
      }
      function parseUrl(value) {
        value = value.replace(/^(\w+:)?\s*[\\/]\s*[\\/]/, "$1//");
        if (value.startsWith("relative:")) {
          throw new Error("relative: exploit attempt");
        }
        let base = "relative://relative-site";
        for (let i = 0; i < 100; i++) {
          base += `/${i}`;
        }
        const parsed = new URL(value, base);
        const isRelativeUrl = parsed && parsed.hostname === "relative-site" && parsed.protocol === "relative:";
        return {
          isRelativeUrl,
          url: parsed
        };
      }
      function filterCss(abstractSyntaxTree, allowedStyles) {
        if (!allowedStyles) {
          return abstractSyntaxTree;
        }
        const astRules = abstractSyntaxTree.nodes[0];
        let selectedRule;
        if (allowedStyles[astRules.selector] && allowedStyles["*"]) {
          selectedRule = mergeStyles(
            allowedStyles[astRules.selector],
            allowedStyles["*"]
          );
        } else {
          selectedRule = allowedStyles[astRules.selector] || allowedStyles["*"];
        }
        if (selectedRule) {
          abstractSyntaxTree.nodes[0].nodes = astRules.nodes.reduce(filterDeclarations(selectedRule), []);
        }
        return abstractSyntaxTree;
      }
      function stringifyStyleAttributes(filteredAST) {
        return filteredAST.nodes[0].nodes.reduce(function(extractedAttributes, attrObject) {
          extractedAttributes.push(
            `${attrObject.prop}:${attrObject.value}${attrObject.important ? " !important" : ""}`
          );
          return extractedAttributes;
        }, []).join(";");
      }
      function filterDeclarations(selectedRule) {
        return function(allowedDeclarationsList, attributeObject) {
          if (has(selectedRule, attributeObject.prop)) {
            const matchesRegex = selectedRule[attributeObject.prop].some(function(regularExpression) {
              return regularExpression.test(attributeObject.value);
            });
            if (matchesRegex) {
              allowedDeclarationsList.push(attributeObject);
            }
          }
          return allowedDeclarationsList;
        };
      }
      function filterClasses(classes, allowed, allowedGlobs) {
        if (!allowed) {
          return classes;
        }
        classes = classes.split(/\s+/);
        return classes.filter(function(clss) {
          return allowed.indexOf(clss) !== -1 || allowedGlobs.some(function(glob) {
            return glob.test(clss);
          });
        }).join(" ");
      }
    }
    var htmlParserDefaults = {
      decodeEntities: true
    };
    sanitizeHtml2.defaults = {
      allowedTags: [
        // Sections derived from MDN element categories and limited to the more
        // benign categories.
        // https://developer.mozilla.org/en-US/docs/Web/HTML/Element
        // Content sectioning
        "address",
        "article",
        "aside",
        "footer",
        "header",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hgroup",
        "main",
        "nav",
        "section",
        // Text content
        "blockquote",
        "dd",
        "div",
        "dl",
        "dt",
        "figcaption",
        "figure",
        "hr",
        "li",
        "menu",
        "ol",
        "p",
        "pre",
        "ul",
        // Inline text semantics
        "a",
        "abbr",
        "b",
        "bdi",
        "bdo",
        "br",
        "cite",
        "code",
        "data",
        "dfn",
        "em",
        "i",
        "kbd",
        "mark",
        "q",
        "rb",
        "rp",
        "rt",
        "rtc",
        "ruby",
        "s",
        "samp",
        "small",
        "span",
        "strong",
        "sub",
        "sup",
        "time",
        "u",
        "var",
        "wbr",
        // Table content
        "caption",
        "col",
        "colgroup",
        "table",
        "tbody",
        "td",
        "tfoot",
        "th",
        "thead",
        "tr"
      ],
      // Tags that cannot be boolean
      nonBooleanAttributes: [
        "abbr",
        "accept",
        "accept-charset",
        "accesskey",
        "action",
        "allow",
        "alt",
        "as",
        "autocapitalize",
        "autocomplete",
        "blocking",
        "charset",
        "cite",
        "class",
        "color",
        "cols",
        "colspan",
        "content",
        "contenteditable",
        "coords",
        "crossorigin",
        "data",
        "datetime",
        "decoding",
        "dir",
        "dirname",
        "download",
        "draggable",
        "enctype",
        "enterkeyhint",
        "fetchpriority",
        "for",
        "form",
        "formaction",
        "formenctype",
        "formmethod",
        "formtarget",
        "headers",
        "height",
        "hidden",
        "high",
        "href",
        "hreflang",
        "http-equiv",
        "id",
        "imagesizes",
        "imagesrcset",
        "inputmode",
        "integrity",
        "is",
        "itemid",
        "itemprop",
        "itemref",
        "itemtype",
        "kind",
        "label",
        "lang",
        "list",
        "loading",
        "low",
        "max",
        "maxlength",
        "media",
        "method",
        "min",
        "minlength",
        "name",
        "nonce",
        "optimum",
        "pattern",
        "ping",
        "placeholder",
        "popover",
        "popovertarget",
        "popovertargetaction",
        "poster",
        "preload",
        "referrerpolicy",
        "rel",
        "rows",
        "rowspan",
        "sandbox",
        "scope",
        "shape",
        "size",
        "sizes",
        "slot",
        "span",
        "spellcheck",
        "src",
        "srcdoc",
        "srclang",
        "srcset",
        "start",
        "step",
        "style",
        "tabindex",
        "target",
        "title",
        "translate",
        "type",
        "usemap",
        "value",
        "width",
        "wrap",
        // Event handlers
        "onauxclick",
        "onafterprint",
        "onbeforematch",
        "onbeforeprint",
        "onbeforeunload",
        "onbeforetoggle",
        "onblur",
        "oncancel",
        "oncanplay",
        "oncanplaythrough",
        "onchange",
        "onclick",
        "onclose",
        "oncontextlost",
        "oncontextmenu",
        "oncontextrestored",
        "oncopy",
        "oncuechange",
        "oncut",
        "ondblclick",
        "ondrag",
        "ondragend",
        "ondragenter",
        "ondragleave",
        "ondragover",
        "ondragstart",
        "ondrop",
        "ondurationchange",
        "onemptied",
        "onended",
        "onerror",
        "onfocus",
        "onformdata",
        "onhashchange",
        "oninput",
        "oninvalid",
        "onkeydown",
        "onkeypress",
        "onkeyup",
        "onlanguagechange",
        "onload",
        "onloadeddata",
        "onloadedmetadata",
        "onloadstart",
        "onmessage",
        "onmessageerror",
        "onmousedown",
        "onmouseenter",
        "onmouseleave",
        "onmousemove",
        "onmouseout",
        "onmouseover",
        "onmouseup",
        "onoffline",
        "ononline",
        "onpagehide",
        "onpageshow",
        "onpaste",
        "onpause",
        "onplay",
        "onplaying",
        "onpopstate",
        "onprogress",
        "onratechange",
        "onreset",
        "onresize",
        "onrejectionhandled",
        "onscroll",
        "onscrollend",
        "onsecuritypolicyviolation",
        "onseeked",
        "onseeking",
        "onselect",
        "onslotchange",
        "onstalled",
        "onstorage",
        "onsubmit",
        "onsuspend",
        "ontimeupdate",
        "ontoggle",
        "onunhandledrejection",
        "onunload",
        "onvolumechange",
        "onwaiting",
        "onwheel"
      ],
      disallowedTagsMode: "discard",
      allowedAttributes: {
        a: ["href", "name", "target"],
        // We don't currently allow img itself by default, but
        // these attributes would make sense if we did.
        img: ["src", "srcset", "alt", "title", "width", "height", "loading"]
      },
      allowedEmptyAttributes: [
        "alt"
      ],
      // Lots of these won't come up by default because we don't allow them
      selfClosing: ["img", "br", "hr", "area", "base", "basefont", "input", "link", "meta", "col"],
      // URL schemes we permit
      allowedSchemes: ["http", "https", "ftp", "mailto", "tel"],
      allowedSchemesByTag: {},
      allowedSchemesAppliedToAttributes: [
        "href",
        "src",
        "cite",
        "action",
        "formaction",
        "data",
        "xlink:href",
        "poster",
        "background",
        "ping",
        "longdesc",
        "usemap",
        "codebase",
        "classid",
        "archive",
        "profile",
        "manifest",
        "itemid",
        "dynsrc",
        "lowsrc"
      ],
      allowProtocolRelative: true,
      enforceHtmlBoundary: false,
      parseStyleAttributes: true,
      preserveEscapedAttributes: false
    };
    sanitizeHtml2.simpleTransform = function(newTagName, newAttribs, merge) {
      merge = merge === void 0 ? true : merge;
      newAttribs = newAttribs || {};
      return function(tagName, attribs) {
        let attrib;
        if (merge) {
          for (attrib in newAttribs) {
            attribs[attrib] = newAttribs[attrib];
          }
        } else {
          attribs = newAttribs;
        }
        return {
          tagName: newTagName,
          attribs
        };
      };
    };
  }
});

// server/app.ts
import fs4 from "node:fs";
import path4 from "node:path";
import express from "express";

// server/services/ai/arizeTelemetry.ts
import { SpanStatusCode, context, trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { getAttributesFromContext, setSession } from "@arizeai/openinference-core";
import {
  INPUT_VALUE,
  OUTPUT_VALUE,
  SemanticConventions,
  SEMRESATTRS_PROJECT_NAME
} from "@arizeai/openinference-semantic-conventions";

// server/config.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var ROOT_DIR = path.resolve(__dirname, "..");
var preExistingEnvKeys = new Set(Object.keys(process.env));
function readEnvFileIntoProcess(onlyKeys) {
  const candidates = [".env", ".env.local"];
  for (const fileName of candidates) {
    const filePath = path.join(ROOT_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (onlyKeys && !onlyKeys.has(key)) continue;
      let value = trimmed.slice(eqIdx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (!preExistingEnvKeys.has(key)) {
        if (fileName === ".env.local" ? value !== "" || process.env[key] === void 0 : process.env[key] === void 0 || onlyKeys && process.env[key] === "") {
          process.env[key] = value;
        }
      }
    }
  }
}
readEnvFileIntoProcess();
function getGeminiApiKey() {
  if (!process.env.GEMINI_API_KEY?.trim() && !preExistingEnvKeys.has("GEMINI_API_KEY")) {
    readEnvFileIntoProcess(/* @__PURE__ */ new Set(["GEMINI_API_KEY"]));
  }
  return (process.env.GEMINI_API_KEY || "").trim();
}
function getTavilyApiKey() {
  if (!process.env.TAVILY_API_KEY?.trim() && !preExistingEnvKeys.has("TAVILY_API_KEY")) {
    readEnvFileIntoProcess(/* @__PURE__ */ new Set(["TAVILY_API_KEY"]));
  }
  return (process.env.TAVILY_API_KEY || "").trim();
}
function parseTavilySearchDepth(raw) {
  const val = (raw || "").trim().toLowerCase();
  if (val === "advanced" || val === "fast" || val === "ultra-fast" || val === "basic") {
    return val;
  }
  return "basic";
}
function parseTavilyIncludeAnswer(raw) {
  const val = (raw || "").trim().toLowerCase();
  if (val === "false" || val === "0" || val === "no") return false;
  if (val === "advanced") return "advanced";
  if (val === "basic") return "basic";
  return true;
}
var IS_VERCEL = Boolean(process.env.VERCEL);
var SERVER_DIR = __dirname;
var DATA_DIR = IS_VERCEL ? path.join(os.tmpdir(), "daklak-data") : path.join(SERVER_DIR, "data");
var DB_PATH = process.env.CMS_DB_PATH || path.join(DATA_DIR, "daklak.db");
var UPLOADS_DIR = process.env.CMS_UPLOADS_DIR || (IS_VERCEL ? path.join(os.tmpdir(), "daklak-uploads") : path.join(SERVER_DIR, "uploads"));
var DIST_DIR = path.join(ROOT_DIR, "dist");
var SUPABASE_STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "uploads").trim();
function getSupabaseUrl() {
  if (!process.env.SUPABASE_URL?.trim() && !preExistingEnvKeys.has("SUPABASE_URL")) {
    readEnvFileIntoProcess(/* @__PURE__ */ new Set(["SUPABASE_URL"]));
  }
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}
function getSupabaseSecretKey() {
  const keysToCheck = ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  if (!process.env.SUPABASE_SECRET_KEY?.trim() && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && !keysToCheck.some((k) => preExistingEnvKeys.has(k))) {
    readEnvFileIntoProcess(new Set(keysToCheck));
  }
  return (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}
function isSupabaseConfigured() {
  if (process.env.CMS_DB_PATH && process.env.FORCE_SUPABASE !== "1") {
    return false;
  }
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}
var PORT = Number(process.env.CMS_PORT || process.env.PORT || 4e3);
var SESSION_COOKIE_NAME = "daklak_session";
var SESSION_TTL_DAYS = 7;
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
var GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
var GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash";
var GEMINI_DECISION_MODEL = process.env.GEMINI_DECISION_MODEL || "";
var TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
var TAVILY_TIMEOUT_MS = Math.max(2e3, Number(process.env.TAVILY_TIMEOUT_MS || 1e4));
var TAVILY_SEARCH_DEPTH = parseTavilySearchDepth(process.env.TAVILY_SEARCH_DEPTH);
var TAVILY_INCLUDE_ANSWER = parseTavilyIncludeAnswer(process.env.TAVILY_INCLUDE_ANSWER);
var TAVILY_MAX_RESULTS = Math.min(10, Math.max(1, Number(process.env.TAVILY_MAX_RESULTS || 5)));
var TAVILY_COUNTRY = (process.env.TAVILY_COUNTRY ?? "vietnam").trim();
var AI_PRICE_TTL_HOURS = Number(process.env.AI_PRICE_TTL_HOURS || 168);
var AI_CHAT_TIMEOUT_MS = Number(process.env.AI_CHAT_TIMEOUT_MS || 3e4);
var AI_RESPONSE_MAX_TOKENS = Number(process.env.AI_RESPONSE_MAX_TOKENS || 4096);
var AI_PRICE_POLICY = {
  currency: "VND",
  priceTtlHours: AI_PRICE_TTL_HOURS,
  lodgingShareCapPct: 40,
  transitShareCapPct: 25,
  contingencyBufferPct: 10,
  fallbackStrategy: "tavily_then_estimate_with_disclaimer"
};
var AI_CHAT_MAX_MESSAGE_LENGTH = 1500;
var AI_CHAT_RATE_LIMIT_MAX = Number(process.env.AI_CHAT_RATE_LIMIT_MAX || 30);
var AI_CHAT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1e3;
var ARIZE_API_KEY = process.env.ARIZE_API_KEY || "";
var ARIZE_SPACE_ID = process.env.ARIZE_SPACE_ID || "";
var ARIZE_PROJECT_NAME = process.env.ARIZE_PROJECT_NAME || "dak-lak-travel-concierge";
var ARIZE_COLLECTOR_ENDPOINT = process.env.ARIZE_COLLECTOR_ENDPOINT || "https://otlp.arize.com";
var DEFAULT_ADMIN_EMAIL = process.env.CMS_ADMIN_EMAIL || "admin@daklak.travel";
var DEFAULT_ADMIN_PASSWORD = process.env.CMS_ADMIN_PASSWORD || "Admin@123";
var DEFAULT_WRITER_EMAIL = process.env.CMS_WRITER_EMAIL || "writer@daklak.travel";
var DEFAULT_WRITER_PASSWORD = process.env.CMS_WRITER_PASSWORD || "Writer@123";

// server/services/ai/arizeTelemetry.ts
var providerInstance = null;
var initialized = false;
function buildArizeTracesUrl(baseEndpoint) {
  const trimmed = baseEndpoint.trim().replace(/\/+$/, "");
  if (!trimmed) return "https://otlp.arize.com/v1/traces";
  if (trimmed.endsWith("/v1/traces")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/traces`;
  return `${trimmed}/v1/traces`;
}
function isArizeConfigured() {
  return Boolean(ARIZE_API_KEY.trim() && ARIZE_SPACE_ID.trim());
}
function initArizeTelemetry() {
  if (initialized && providerInstance) return true;
  if (!isArizeConfigured()) {
    return false;
  }
  initialized = true;
  const projectName = ARIZE_PROJECT_NAME.trim() || "dak-lak-travel-concierge";
  const url = buildArizeTracesUrl(ARIZE_COLLECTOR_ENDPOINT);
  const exporter = new OTLPTraceExporter({
    url,
    headers: {
      "arize-space-id": ARIZE_SPACE_ID.trim(),
      "arize-api-key": ARIZE_API_KEY.trim()
    }
  });
  const processor = process.env.NODE_ENV === "production" ? new BatchSpanProcessor(exporter) : new SimpleSpanProcessor(exporter);
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: projectName,
      [SEMRESATTRS_PROJECT_NAME]: projectName
    }),
    spanProcessors: [processor]
  });
  provider.register();
  providerInstance = provider;
  console.log(
    `[Arize AX] Tracing initialized -> project="${projectName}", endpoint="${url}", space="${ARIZE_SPACE_ID.trim()}"`
  );
  return true;
}
function getArizeTracer() {
  return trace.getTracer("dak-lak-ai-concierge");
}
function toSafeSpanValue(value, maxLen = 12e3) {
  try {
    const raw = typeof value === "string" ? value : JSON.stringify(value ?? "", (_k, v) => typeof v === "bigint" ? v.toString() : v);
    if (!raw) return "";
    return raw.length > maxLen ? `${raw.slice(0, maxLen)}\u2026[truncated]` : raw;
  } catch {
    const fallback = String(value ?? "");
    return fallback.length > maxLen ? `${fallback.slice(0, maxLen)}\u2026[truncated]` : fallback;
  }
}
async function withSessionScope(sessionId, fn) {
  if (!sessionId.trim()) return fn();
  const sessionCtx = setSession(context.active(), { sessionId: sessionId.trim() });
  return context.with(sessionCtx, fn);
}
async function withOpenInferenceSpan(name, opts, fn) {
  const tracer = getArizeTracer();
  return tracer.startActiveSpan(name, async (span) => {
    const ctxAttrs = getAttributesFromContext(context.active());
    if (ctxAttrs) {
      span.setAttributes(ctxAttrs);
    }
    span.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, opts.kind);
    span.setAttribute(INPUT_VALUE, toSafeSpanValue(opts.input));
    if (opts.attributes) {
      span.setAttributes(opts.attributes);
    }
    try {
      const result = await fn(span);
      const outputPayload = opts.formatOutput ? opts.formatOutput(result) : result;
      span.setAttribute(OUTPUT_VALUE, toSafeSpanValue(outputPayload));
      if (opts.onSuccess) {
        opts.onSuccess(span, result);
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      span.recordException(errorObj);
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorObj.message });
      span.setAttribute(OUTPUT_VALUE, toSafeSpanValue({ error: errorObj.message }));
      throw err;
    } finally {
      span.end();
    }
  });
}

// server/db/database.ts
import fs2 from "node:fs";
import { createRequire } from "node:module";
import path2 from "node:path";

// server/db/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
var adminClient = null;
var cachedSignature = "";
function isUsingSupabase() {
  return isSupabaseConfigured();
}
function getSupabaseAdmin() {
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!url || !secretKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  const signature = `${url}::${secretKey}`;
  if (adminClient && cachedSignature === signature) {
    return adminClient;
  }
  adminClient = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  cachedSignature = signature;
  return adminClient;
}

// server/db/database.ts
var require2 = createRequire(import.meta.url);
var dbInstance = null;
function getDb() {
  if (dbInstance) return dbInstance;
  fs2.mkdirSync(path2.dirname(DB_PATH), { recursive: true });
  fs2.mkdirSync(UPLOADS_DIR, { recursive: true });
  const sqlite = require2("node:sqlite");
  const db = new sqlite.DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'writer')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      legacy_key TEXT UNIQUE,
      section TEXT NOT NULL CHECK (section IN ('bento', 'stories')),
      status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'published')) DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      review_note TEXT NOT NULL DEFAULT '',
      cover_image TEXT NOT NULL,
      image_alt TEXT NOT NULL DEFAULT '',
      theme_key TEXT NOT NULL CHECK (theme_key IN ('coffee', 'culture', 'nature', 'cuisine')),
      section_meta_json TEXT NOT NULL DEFAULT '{}',

      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      read_time TEXT NOT NULL,
      cta_label TEXT NOT NULL,
      preview_paragraphs_json TEXT NOT NULL DEFAULT '[]',
      content_html TEXT NOT NULL DEFAULT '',
      quote TEXT NOT NULL DEFAULT '',
      quote_source TEXT NOT NULL DEFAULT '',
      glossary_json TEXT NOT NULL DEFAULT '[]',

      title_en TEXT NOT NULL DEFAULT '',
      excerpt_en TEXT NOT NULL DEFAULT '',
      category_en TEXT NOT NULL DEFAULT '',
      location_en TEXT NOT NULL DEFAULT '',
      read_time_en TEXT NOT NULL DEFAULT '',
      cta_label_en TEXT NOT NULL DEFAULT '',
      preview_paragraphs_en_json TEXT NOT NULL DEFAULT '[]',
      content_html_en TEXT NOT NULL DEFAULT '',
      quote_en TEXT NOT NULL DEFAULT '',
      quote_source_en TEXT NOT NULL DEFAULT '',
      glossary_en_json TEXT NOT NULL DEFAULT '[]',
      translation_status TEXT NOT NULL DEFAULT 'none' CHECK (translation_status IN ('none', 'pending', 'translated', 'failed')),
      translation_provider TEXT NOT NULL DEFAULT '',
      translated_at TEXT,

      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_section_status ON posts(section, status, sort_order);
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS stays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      area TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('budget', 'standard', 'luxury')),
      nightly_rate_vnd INTEGER NOT NULL,
      capacity_min INTEGER NOT NULL DEFAULT 1,
      capacity_max INTEGER NOT NULL DEFAULT 4,
      suitable_for_json TEXT NOT NULL DEFAULT '[]',
      amenities_json TEXT NOT NULL DEFAULT '[]',
      source_note TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('budget', 'standard', 'luxury')),
      daily_rate_vnd INTEGER NOT NULL,
      capacity_min INTEGER NOT NULL DEFAULT 1,
      capacity_max INTEGER NOT NULL DEFAULT 4,
      suitable_for_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS place_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_title TEXT UNIQUE NOT NULL,
      area_cluster TEXT NOT NULL,
      ticket_vnd INTEGER NOT NULL DEFAULT 0,
      estimated_spend_vnd INTEGER NOT NULL DEFAULT 0,
      price_source TEXT NOT NULL DEFAULT 'seed' CHECK (price_source IN ('seed', 'sqlite_cache', 'tavily', 'estimated')),
      price_note TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      fetched_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_traces (
      trace_id TEXT PRIMARY KEY,
      lang TEXT NOT NULL DEFAULT 'vi',
      user_message TEXT NOT NULL,
      intent TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('needs_clarification', 'completed')),
      provider TEXT NOT NULL DEFAULT '',
      intake_json TEXT NOT NULL DEFAULT '{}',
      capacity_json TEXT NOT NULL DEFAULT '{}',
      budget_json TEXT NOT NULL DEFAULT '{}',
      purpose_json TEXT NOT NULL DEFAULT '{}',
      eval_json TEXT NOT NULL DEFAULT '{}',
      latency_ms INTEGER NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      feedback_rating INTEGER CHECK (feedback_rating IN (-1, 1)),
      feedback_comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_stays_tier_active ON stays(tier, is_active);
    CREATE INDEX IF NOT EXISTS idx_stays_area ON stays(area);
    CREATE INDEX IF NOT EXISTS idx_logistics_tier_active ON logistics(tier, is_active);
    CREATE INDEX IF NOT EXISTS idx_place_prices_area ON place_prices(area_cluster);
    CREATE INDEX IF NOT EXISTS idx_place_prices_fetched ON place_prices(fetched_at);
    CREATE INDEX IF NOT EXISTS idx_ai_traces_created ON ai_traces(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_traces_intent_status ON ai_traces(intent, status);
  `);
  dbInstance = db;
  return db;
}

// src/data/articles.ts
var bentoOverviewCards = [
  {
    index: 0,
    articleKey: "coffee",
    size: "large",
    colSpanClass: "md:col-span-7 lg:col-span-8",
    imageLayout: "left",
    image: "https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80",
    imageAlt: "C\xE0 ph\xEA Robusta \u0110\u1EAFk L\u1EAFk",
    imageBgClass: "bg-[#132A1E]",
    title: "Th\u1EE7 ph\u1EE7 C\xE0 ph\xEA Th\u1EBF gi\u1EDBi",
    description: "H\xE0nh tr\xECnh t\u1EEB nh\u1EEFng r\u1EABy c\xE0 ph\xEA b\u1EA1t ng\xE0n tr\xEAn \u0111\u1EA5t \u0111\u1ECF bazan \u0111\u1EBFn B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA v\xE0 t\xE1ch Fine Robusta nguy\xEAn b\u1EA3n \u0111\xE1nh th\u1EE9c m\u1ECDi gi\xE1c quan.",
    cta: "Kh\xE1m ph\xE1 h\xE0nh tr\xECnh h\u1EA1t Robusta"
  },
  {
    index: 1,
    articleKey: "gong",
    size: "small",
    colSpanClass: "md:col-span-5 lg:col-span-4",
    imageLayout: "top",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/18/Tay_Nguyen_gongs.JPG",
    imageAlt: "Kh\xF4ng gian V\u0103n h\xF3a C\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn",
    imageBgClass: "bg-[#132A1E]",
    title: "Kh\xF4ng gian V\u0103n h\xF3a C\u1ED3ng chi\xEAng",
    description: "Di s\u1EA3n v\u0103n h\xF3a phi v\u1EADt th\u1EC3 c\u1EE7a nh\xE2n lo\u1EA1i, n\u01A1i \xE2m thanh \u0111\u1EA1i ng\xE0n vang v\u1ECDng b\xEAn ch\xE9 r\u01B0\u1EE3u c\u1EA7n trong nh\u1EEFng \u0111\xEAm h\u1ED9i bu\xF4n l\xE0ng.",
    cta: "L\u1EAFng nghe \xE2m vang \u0111\u1EA1i ng\xE0n"
  },
  {
    index: 2,
    articleKey: "matriarchy",
    size: "small",
    colSpanClass: "md:col-span-5 lg:col-span-4",
    imageLayout: "top",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Dan_toc_hoc_19.jpg",
    imageAlt: "Ki\u1EBFn tr\xFAc Nh\xE0 D\xE0i \xCA \u0110\xEA",
    imageBgClass: "bg-[#132A1E]",
    title: "D\u1EA5u \u1EA5n Ch\u1EBF \u0111\u1ED9 M\u1EABu h\u1EC7",
    description: "N\xE9t \u0111\u1EB9p \u0111\u1ED9c b\u1EA3n trong ki\u1EBFn tr\xFAc nh\xE0 d\xE0i \xCA \u0110\xEA, c\u1EA7u thang c\xE1i ch\u1EA1m kh\u1EAFc v\u1EA7ng tr\u0103ng khuy\u1EBFt v\xE0 quy\u1EC1n uy d\u1ECBu d\xE0ng c\u1EE7a ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF T\xE2y Nguy\xEAn.",
    cta: "B\u01B0\u1EDBc v\xE0o kh\xF4ng gian Nh\xE0 D\xE0i"
  },
  {
    index: 3,
    articleKey: "waterfalls",
    size: "large",
    colSpanClass: "md:col-span-7 lg:col-span-8",
    imageLayout: "left",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Draynur_falls.jpg",
    imageAlt: "Th\xE1c Dray Nur \u0110\u1EAFk L\u1EAFk",
    imageBgClass: "bg-[#0F2419]",
    title: "K\u1EF3 quan Th\xE1c n\u01B0\u1EDBc & H\u1ED3 t\u1EF1 nhi\xEAn",
    description: "S\u1EF1 giao h\xF2a k\u1EF3 v\u0129 gi\u1EEFa b\u1EE9c t\u01B0\u1EDDng n\u01B0\u1EDBc tr\u1EAFng x\xF3a d\xE0i 250m c\u1EE7a c\u1EE5m th\xE1c Dray Nur \u2013 Dray S\xE1p v\xE0 m\u1EB7t g\u01B0\u01A1ng t\u0129nh l\u1EB7ng soi b\xF3ng thuy\u1EC1n \u0111\u1ED9c m\u1ED9c tr\xEAn H\u1ED3 L\u1EAFk l\xFAc ho\xE0ng h\xF4n.",
    cta: "Chinh ph\u1EE5c cung \u0111\u01B0\u1EDDng th\xE1c & h\u1ED3"
  },
  {
    index: 4,
    articleKey: "bandon",
    size: "large",
    colSpanClass: "md:col-span-7 lg:col-span-8",
    imageLayout: "top",
    image: "https://images.unsplash.com/photo-1677741447050-e166cf1a1f14?auto=format&fit=crop&w=1000&q=80",
    imageAlt: "Voi r\u1EEBng v\xE0 R\u1EEBng kh\u1ED9p Yok \u0110\xF4n",
    imageBgClass: "bg-[#182E22]",
    title: "Huy\u1EC1n tho\u1EA1i B\u1EA3n \u0110\xF4n & Voi r\u1EEBng",
    description: "V\xF9ng \u0111\u1EA5t giao thoa v\u0103n h\xF3a \xCA \u0110\xEA \u2013 M\u2019n\xF4ng \u2013 L\xE0o b\xEAn d\xF2ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c, n\u01A1i du kh\xE1ch \u0111i b\u1ED9 d\u01B0\u1EDBi t\xE1n r\u1EEBng kh\u1ED9p Yok \u0110\xF4n v\xE0 tr\u1EA3i nghi\u1EC7m du l\u1ECBch th\xE2n thi\u1EC7n c\xF9ng voi.",
    cta: "Gi\u1EA3i m\xE3 k\xFD \u1EE9c s\u0103n voi B\u1EA3n \u0110\xF4n"
  },
  {
    index: 5,
    articleKey: "cuisine",
    size: "small",
    colSpanClass: "md:col-span-5 lg:col-span-4",
    imageLayout: "top",
    image: "https://images.unsplash.com/photo-1648141643305-efb7d2542602?auto=format&fit=crop&w=1000&q=80",
    imageAlt: "G\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n & \u1EA8m th\u1EF1c T\xE2y Nguy\xEAn",
    imageBgClass: "bg-[#132A1E]",
    title: "B\u1EA3n giao h\u01B0\u1EDFng \u1EA8m th\u1EF1c \u0110\u1EA1i ng\xE0n",
    description: "\u0110\xE1nh th\u1EE9c v\u1ECB gi\xE1c v\u1EDBi g\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n ch\u1EA5m mu\u1ED1i \u1EDBt xi\xEAm xanh, c\u01A1m lam \u1ED1ng n\u1EE9a, c\xE1 l\u0103ng S\xEAr\xEAp\u1ED1k v\xE0 canh l\xE1 b\xE9p ng\u1ECDt thanh.",
    cta: "Th\u01B0\u1EDFng th\u1EE9c h\u01B0\u01A1ng v\u1ECB n\xFAi r\u1EEBng"
  }
];
var bentoArticlesData = {
  coffee: {
    category: "Th\u1EE7 ph\u1EE7 C\xE0 ph\xEA",
    readTime: "5 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n Ma Thu\u1ED9t \u2022 C\u01B0 M\u2019gar \u2022 Ea T\xE2n",
    themeKey: "coffee",
    title: "Th\u1EE7 ph\u1EE7 C\xE0 ph\xEA Th\u1EBF gi\u1EDBi: T\u1EEB \u0111\u1EA5t \u0111\u1ECF Bazan \u0111\u1EBFn t\xE1ch Robusta \u0111\xE1nh th\u1EE9c m\u1ECDi gi\xE1c quan",
    paragraphs: [
      "\u1EDE \u0111\u1ED9 cao 500\u2013800m so v\u1EDBi m\u1EF1c n\u01B0\u1EDBc bi\u1EC3n, l\u1EDBp \u0111\u1EA5t \u0111\u1ECF bazan m\xE0u m\u1EE1 c\u1EE7a \u0110\u1EAFk L\u1EAFk t\xEDch t\u1EE5 d\u01B0\u1EE1ng ch\u1EA5t t\u1EEB nh\u1EEFng \u0111\u1EE3t phun tr\xE0o n\xFAi l\u1EEDa c\u1ED5 \u0111\u1EA1i \u0111\xE3 t\u1EA1o n\xEAn \u201Cth\xE1nh \u0111\u1ECBa\u201D cho c\xE2y c\xE0 ph\xEA Robusta. Kh\xF4ng ch\u1EC9 \u0111\u1EE9ng \u0111\u1EA7u c\u1EA3 n\u01B0\u1EDBc v\u1EC1 s\u1EA3n l\u01B0\u1EE3ng, Bu\xF4n Ma Thu\u1ED9t \u0111ang d\u1EABn d\u1EAFt l\xE0n s\xF3ng Fine Robusta \u0111\u1EA7y t\u1EF1 h\xE0o.",
      "T\u1EA1i B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA v\u1EDBi ki\u1EBFn tr\xFAc l\u1EA5y c\u1EA3m h\u1EE9ng t\u1EEB nh\u1EEFng n\u1EBFp nh\xE0 d\xE0i \xCA \u0110\xEA, du kh\xE1ch \u0111\u01B0\u1EE3c \u0111i qua h\xE0nh tr\xECnh v\u0103n minh c\xE0 ph\xEA nh\xE2n lo\u1EA1i tr\u01B0\u1EDBc khi t\u1EF1 tay th\u01B0\u1EDFng th\u1EE9c m\u1ED9t t\xE1ch Robusta s\u01A1 ch\u1EBF m\u1EADt ong \u0111\u1EADm h\u1EADu ng\u1ECDt s\xE2u."
    ],
    quote: "\u201CM\u1ED7i t\xE1ch c\xE0 ph\xEA Bu\xF4n Ma Thu\u1ED9t l\xE0 tinh t\xFAy c\u1EE7a n\u1EAFng gi\xF3 cao nguy\xEAn v\xE0 s\u1EF1 ki\xEAn nh\u1EABn c\u1EE7a \u0111\xF4i b\xE0n tay ng\u01B0\u1EDDi tr\u1ED3ng v\u01B0\u1EDDn.\u201D",
    quoteSource: "\u2014 Ch\u1EC9 d\u1EABn \u0110\u1ECBa l\xFD Qu\u1ED1c gia C\xE0 ph\xEA Bu\xF4n Ma Thu\u1ED9t",
    glossary: [
      { term: "Fine Robusta", def: "C\xE0 ph\xEA Robusta ch\u1EA5t l\u01B0\u1EE3ng cao \u0111\u1EA1t chu\u1EA9n CQI v\u1EDBi h\u01B0\u01A1ng v\u1ECB socola \u0111en, h\u1EA1t d\u1EBB v\xE0 h\u1EADu ng\u1ECDt." },
      { term: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA", def: "Bi\u1EC3u t\u01B0\u1EE3ng ki\u1EBFn tr\xFAc \u0111\u01B0\u01A1ng \u0111\u1EA1i t\u1EA1i Bu\xF4n Ma Thu\u1ED9t l\u01B0u gi\u1EEF h\u01A1n 10.000 hi\u1EC7n v\u1EADt c\xE0 ph\xEA." }
    ]
  },
  gong: {
    category: "Di s\u1EA3n Nh\xE2n lo\u1EA1i",
    readTime: "6 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n l\xE0ng \xCA \u0110\xEA & M\u2019n\xF4ng \u2022 \u0110\u1EAFk L\u1EAFk",
    themeKey: "culture",
    title: "Kh\xF4ng gian V\u0103n h\xF3a C\u1ED3ng chi\xEAng: \xC2m thanh \u0111\u1EA1i ng\xE0n b\xEAn ch\xE9 r\u01B0\u1EE3u c\u1EA7n",
    paragraphs: [
      "Trong \u0111\u1EDDi s\u1ED1ng t\xE2m linh c\u1EE7a ng\u01B0\u1EDDi \xCA \u0110\xEA v\xE0 M\u2019n\xF4ng t\u1EA1i \u0110\u1EAFk L\u1EAFk, ti\u1EBFng c\u1ED3ng chi\xEAng l\xE0 s\u1EE3i d\xE2y k\u1EBFt n\u1ED1i con ng\u01B0\u1EDDi v\u1EDBi th\u1EA7n linh (Y\xE0ng) v\xE0 thi\xEAn nhi\xEAn. T\u1EEB l\u1EC5 th\u1ED5i tai cho tr\u1EBB s\u01A1 sinh, l\u1EC5 m\u1EEBng l\xFAa m\u1EDBi \u0111\u1EBFn l\u1EC5 c\xFAng b\u1EBFn n\u01B0\u1EDBc, \xE2m vang d\xE0n chi\xEAng Knah lu\xF4n gi\u1EEF vai tr\xF2 trung t\xE2m.",
      "Qu\xE2y qu\u1EA7n b\xEAn \xE1nh l\u1EEDa b\u1EADp b\xF9ng trong gian kh\xE1ch nh\xE0 d\xE0i, nh\u1EA5p ng\u1EE5m r\u01B0\u1EE3u c\u1EA7n \u1EE7 men l\xE1 r\u1EEBng v\xE0 l\u1EAFng nghe nh\u1ECBp chi\xEAng tr\u1EA7m b\u1ED5ng l\xE0 kho\u1EA3nh kh\u1EAFc du kh\xE1ch ch\u1EA1m s\xE2u nh\u1EA5t v\xE0o h\u1ED3n c\u1ED1t T\xE2y Nguy\xEAn."
    ],
    quote: "\u201CTi\u1EBFng chi\xEAng vang l\xEAn \u1EDF \u0111\xE2u, h\u1ED3n thi\xEAng \u0111\u1EA1i ng\xE0n th\u1EE9c gi\u1EA5c \u1EDF \u0111\xF3.\u201D",
    quoteSource: "\u2014 Kh\xF4ng gian V\u0103n h\xF3a C\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn (UNESCO)",
    glossary: [
      { term: "Chi\xEAng Knah", def: "B\u1ED9 chi\xEAng \u0111\u1ED3ng truy\u1EC1n th\u1ED1ng c\u1EE7a ng\u01B0\u1EDDi \xCA \u0110\xEA g\u1ED3m nhi\u1EC1u chi\u1EBFc c\xF3 k\xEDch c\u1EE1 v\xE0 cao \u0111\u1ED9 h\xF2a \xE2m tinh t\u1EBF." },
      { term: "R\u01B0\u1EE3u c\u1EA7n", def: "Th\u1EE9c u\u1ED1ng c\u1ED9ng \u0111\u1ED3ng \u1EE7 t\u1EEB g\u1EA1o n\u1EBFp, bo bo c\xF9ng men v\u1ECF c\xE2y r\u1EEBng trong ch\xE9 g\u1ED1m c\u1ED5." }
    ]
  },
  matriarchy: {
    category: "V\u0103n h\xF3a M\u1EABu h\u1EC7",
    readTime: "6 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n Ako Dh\xF4ng \u2022 TP. Bu\xF4n Ma Thu\u1ED9t",
    themeKey: "culture",
    title: "D\u1EA5u \u1EA5n Ch\u1EBF \u0111\u1ED9 M\u1EABu h\u1EC7: Ki\u1EBFn tr\xFAc Nh\xE0 D\xE0i \xCA \u0110\xEA & C\u1EA7u thang ch\u1EA1m kh\u1EAFc",
    paragraphs: [
      "Theo truy\u1EC1n th\u1ED1ng m\u1EABu h\u1EC7 \xCA \u0110\xEA, ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF l\xE0 tr\u1EE5 c\u1ED9t gi\u1EEF l\u1EEDa v\xE0 con g\xE1i \xFAt l\xE0 ng\u01B0\u1EDDi th\u1EEBa k\u1EBF ng\xF4i nh\xE0 \u0111\u1EC3 ph\u1EE5ng d\u01B0\u1EE1ng cha m\u1EB9. M\u1ED7i khi m\u1ED9t ng\u01B0\u1EDDi con g\xE1i trong gia \u0111\xECnh l\u1EADp gia \u0111\xECnh v\xE0 \u0111\xF3n ch\u1ED3ng v\u1EC1 \u1EDF r\u1EC3, ng\xF4i nh\xE0 d\xE0i l\u1EA1i \u0111\u01B0\u1EE3c n\u1ED1i th\xEAm m\u1ED9t nh\u1ECBp x\xE0 m\u1EDBi.",
      "Ngay tr\u01B0\u1EDBc hi\xEAn nh\xE0, chi\u1EBFc c\u1EA7u thang ch\xEDnh lu\xF4n \u0111\u01B0\u1EE3c \u0111\u1EBDo t\u1EEB m\u1ED9t th\xE2n g\u1ED7 l\u1EDBn v\u1EDBi h\xECnh t\u01B0\u1EE3ng \u0111\xF4i b\u1EA7u s\u1EEFa m\u1EB9 v\xE0 v\u1EA7ng tr\u0103ng khuy\u1EBFt \u2014 l\u1EDDi nh\u1EAFc nh\u1EDF trang tr\u1ECDng v\u1EC1 l\xF2ng bi\u1EBFt \u01A1n ngu\u1ED3n c\u1ED9i."
    ],
    quote: "\u201CNg\xF4i nh\xE0 d\xE0i \xCA \u0110\xEA l\u1EDBn l\xEAn theo t\u1EEBng cu\u1ED9c h\xF4n nh\xE2n, l\u01B0u gi\u1EEF k\xFD \u1EE9c nhi\u1EC1u th\u1EBF h\u1EC7 d\u01B0\u1EDBi m\u1ED9t m\xE1i tranh.\u201D",
    quoteSource: "\u2014 T\u01B0 li\u1EC7u V\u0103n h\xF3a B\u1EA3n \u0111\u1ECBa Bu\xF4n Ako Dh\xF4ng",
    glossary: [
      { term: "C\u1EA7u thang c\xE1i (Kpan)", def: "C\u1EA7u thang ch\xEDnh ch\u1EA1m kh\u1EAFc \u0111\xF4i b\u1EA7u s\u1EEFa m\u1EB9 t\xF4n vinh ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF \xCA \u0110\xEA." },
      { term: "Gh\u1EBF Kpan", def: "Chi\u1EBFc gh\u1EBF g\u1ED7 nguy\xEAn kh\u1ED1i d\xE0i 10\u201320m \u0111\u1EB7t d\u1ECDc v\xE1ch gian kh\xE1ch d\xE0nh cho d\xE0n ngh\u1EC7 nh\xE2n \u0111\xE1nh chi\xEAng." }
    ]
  },
  waterfalls: {
    category: "K\u1EF3 quan Thi\xEAn nhi\xEAn",
    readTime: "5 ph\xFAt \u0111\u1ECDc",
    location: "S\xF4ng S\xEAr\xEAp\u1ED1k & Huy\u1EC7n L\u1EAFk",
    themeKey: "nature",
    title: "K\u1EF3 quan Th\xE1c n\u01B0\u1EDBc & H\u1ED3 t\u1EF1 nhi\xEAn: T\u1EEB Dray Nur h\xF9ng v\u0129 \u0111\u1EBFn H\u1ED3 L\u1EAFk t\u0129nh l\u1EB7ng",
    paragraphs: [
      "\u0110\u1EAFk L\u1EAFk s\u1EDF h\u1EEFu hai th\xE1i c\u1EF1c thi\xEAn nhi\xEAn k\u1EF3 th\xFA: s\u1EF1 m\u1EA1nh m\u1EBD cu\u1ED9n tr\xE0o c\u1EE7a c\u1EE5m th\xE1c Dray Nur \u2013 Dray S\xE1p \u2013 Gia Long tr\xEAn d\xF2ng s\xF4ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c, v\xE0 v\u1EBB \u0111\u1EB9p tr\u1EA7m m\u1EB7c, ph\u1EB3ng l\u1EB7ng nh\u01B0 g\u01B0\u01A1ng c\u1EE7a H\u1ED3 L\u1EAFk r\u1ED9ng h\u01A1n 500 hecta d\u01B0\u1EDBi ch\xE2n d\xE3y Ch\u01B0 Yang Sin.",
      "Du kh\xE1ch c\xF3 th\u1EC3 d\xE0nh bu\u1ED5i s\xE1ng trekking xuy\xEAn r\u1EEBng \u0111\u1EB7c d\u1EE5ng ng\u1EAFm m\xE0n n\u01B0\u1EDBc tr\u1EAFng x\xF3a v\xE0 bu\u1ED5i chi\u1EC1u ch\xE8o thuy\u1EC1n \u0111\u1ED9c m\u1ED9c \u0111\xF3n ho\xE0ng h\xF4n t\xEDm bi\u1EBFc tr\xEAn m\u1EB7t h\u1ED3."
    ],
    quote: "\u201CM\u1ED9t b\xEAn l\xE0 b\u1EA3n giao h\u01B0\u1EDFng c\u1EE7a n\u01B0\u1EDBc v\xE0 \u0111\xE1 bazan, m\u1ED9t b\xEAn l\xE0 t\u1EA5m g\u01B0\u01A1ng soi t\u0129nh t\u1EA1i c\u1EE7a tr\u1EDDi cao nguy\xEAn.\u201D",
    quoteSource: "\u2014 C\u1EA9m nang Kh\xE1m ph\xE1 Sinh th\xE1i \u0110\u1EAFk L\u1EAFk",
    glossary: [
      { term: "Th\xE1c Dray Nur", def: "Ng\u1ECDn th\xE1c h\xF9ng v\u0129 b\u1EADc nh\u1EA5t T\xE2y Nguy\xEAn v\u1EDBi b\u1EE9c t\u01B0\u1EDDng n\u01B0\u1EDBc r\u1ED9ng h\u01A1n 250m." },
      { term: "H\u1ED3 L\u1EAFk", def: "H\u1ED3 n\u01B0\u1EDBc ng\u1ECDt t\u1EF1 nhi\xEAn l\u1EDBn nh\u1EA5t T\xE2y Nguy\xEAn, g\u1EAFn v\u1EDBi bu\xF4n l\xE0ng ng\u01B0\u1EDDi M\u2019n\xF4ng R\u2019l\xE2m." }
    ]
  },
  bandon: {
    category: "Huy\u1EC1n tho\u1EA1i Cao nguy\xEAn",
    readTime: "5 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n \u0110\xF4n \u2022 V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n",
    themeKey: "nature",
    title: "Huy\u1EC1n tho\u1EA1i B\u1EA3n \u0110\xF4n & Voi r\u1EEBng: K\xFD \u1EE9c v\u01B0\u1EE3t s\xF4ng S\xEAr\xEAp\u1ED1k",
    paragraphs: [
      "N\u1EB1m b\xEAn b\u1EDD d\xF2ng s\xF4ng S\xEAr\xEAp\u1ED1k huy\u1EC1n tho\u1EA1i, B\u1EA3n \u0110\xF4n t\u1EEB l\xE2u n\u1ED5i ti\u1EBFng v\u1EDBi ngh\u1EC1 s\u0103n b\u1EAFt v\xE0 thu\u1EA7n d\u01B0\u1EE1ng voi r\u1EEBng tr\u1EE9 danh c\u1EE7a c\u1ED9ng \u0111\u1ED3ng ng\u01B0\u1EDDi M\u2019n\xF4ng, \xCA \u0110\xEA v\xE0 L\xE0o.",
      "Ng\xE0y nay, v\xF9ng \u0111\u1EA5t n\xE0y \u0111ang vi\u1EBFt ti\u1EBFp ch\u01B0\u01A1ng m\u1EDBi nh\xE2n v\u0103n h\u01A1n v\u1EDBi m\xF4 h\xECnh du l\u1ECBch th\xE2n thi\u1EC7n c\xF9ng voi t\u1EA1i V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n \u2014 n\u01A1i du kh\xE1ch \u0111i b\u1ED9 trong r\u1EEBng kh\u1ED9p v\xE0 quan s\xE1t voi t\u1EF1 do trong m\xF4i tr\u01B0\u1EDDng t\u1EF1 nhi\xEAn."
    ],
    quote: "\u201CVoi \u1EDF B\u1EA3n \u0110\xF4n kh\xF4ng ch\u1EC9 l\xE0 t\xE0i s\u1EA3n, m\xE0 l\xE0 ng\u01B0\u1EDDi b\u1EA1n th\xE2n thi\u1EBFt nh\u01B0 th\xE0nh vi\xEAn trong gia \u0111\xECnh.\u201D",
    quoteSource: "\u2014 K\xFD \u1EE9c Bu\xF4n \u0110\xF4n b\xEAn d\xF2ng S\xEAr\xEAp\u1ED1k",
    glossary: [
      { term: "R\u1EEBng kh\u1ED9p Yok \u0110\xF4n", def: "H\u1EC7 sinh th\xE1i r\u1EEBng r\u1EE5ng l\xE1 m\xF9a kh\xF4 \u0111\u1ED9c nh\u1EA5t Vi\u1EC7t Nam." },
      { term: "Du l\u1ECBch th\xE2n thi\u1EC7n v\u1EDBi voi", def: "Tr\u1EA3i nghi\u1EC7m kh\xF4ng c\u01B0\u1EE1i voi, t\xF4n tr\u1ECDng ph\xFAc l\u1EE3i \u0111\u1ED9ng v\u1EADt v\xE0 b\u1EA3o t\u1ED3n sinh c\u1EA3nh." }
    ]
  },
  cuisine: {
    category: "\u1EA8m th\u1EF1c B\u1EA3n \u0111\u1ECBa",
    readTime: "4 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n Ma Thu\u1ED9t \u2022 B\u1EA3n \u0110\xF4n \u2022 H\u1ED3 L\u1EAFk",
    themeKey: "cuisine",
    title: "B\u1EA3n giao h\u01B0\u1EDFng \u1EA8m th\u1EF1c \u0110\u1EA1i ng\xE0n: H\u01B0\u01A1ng v\u1ECB m\u1ED9c m\u1EA1c \u0111\xE1nh th\u1EE9c v\u1ECB gi\xE1c",
    paragraphs: [
      "\u1EA8m th\u1EF1c \u0110\u1EAFk L\u1EAFk l\xE0 s\u1EF1 h\xF2a quy\u1EC7n tinh t\u1EBF gi\u1EEFa nguy\xEAn li\u1EC7u n\xFAi r\u1EEBng nguy\xEAn b\u1EA3n v\xE0 c\xE1ch ch\u1EBF bi\u1EBFn m\u1ED9c m\u1EA1c b\xEAn b\u1EBFp l\u1EEDa: g\xE0 th\u1EA3 v\u01B0\u1EDDn B\u1EA3n \u0110\xF4n n\u01B0\u1EDBng mu\u1ED1i \u1EDBt xi\xEAm xanh, c\u01A1m lam n\u01B0\u1EDBng \u1ED1ng n\u1EE9a non d\u1EBBo th\u01A1m v\xE0 c\xE1 l\u0103ng t\u01B0\u01A1i r\xF3i t\u1EEB s\xF4ng S\xEAr\xEAp\u1ED1k.",
      "\u0110\u1EB7c bi\u1EC7t, du kh\xE1ch kh\xF3 c\xF3 th\u1EC3 qu\xEAn v\u1ECB ng\u1ECDt thanh c\u1EE7a canh l\xE1 b\xE9p n\u1EA5u t\xF4m s\xF4ng hay v\u1ECB \u0111\u1EAFng h\u1EADu \u0111\u1EA7y cu\u1ED1n h\xFAt c\u1EE7a m\xF3n c\xE0 \u0111\u1EAFng gi\xE3 ki\u1EBFn v\xE0ng."
    ],
    quote: "\u201CM\u1ED7i m\xF3n \u0103n \u0111\u1EA1i ng\xE0n \u0111\u1EC1u mang theo h\u01B0\u01A1ng kh\xF3i b\u1EBFp nh\xE0 d\xE0i v\xE0 v\u1ECB t\u01B0\u01A1i nguy\xEAn c\u1EE7a r\u1EEBng xanh.\u201D",
    quoteSource: "\u2014 B\u1EA3n \u0111\u1ED3 \u1EA8m th\u1EF1c \u0110\u1EAFk L\u1EAFk",
    glossary: [
      { term: "Canh l\xE1 b\xE9p", def: "Lo\u1EA1i rau r\u1EEBng \u0111\u1EB7c tr\u01B0ng c\xF3 v\u1ECB ng\u1ECDt b\xF9i t\u1EF1 nhi\xEAn, th\u01B0\u1EDDng n\u1EA5u c\xF9ng t\xF4m su\u1ED1i ho\u1EB7c th\u1ECBt hun kh\xF3i." },
      { term: "C\u01A1m lam \u1ED1ng n\u1EE9a", def: "G\u1EA1o n\u1EBFp n\u01B0\u01A1ng ng\xE2m n\u01B0\u1EDBc su\u1ED1i, n\u01B0\u1EDBng ch\xEDn trong \u1ED1ng n\u1EE9a non t\u1EA1o h\u01B0\u01A1ng th\u01A1m thanh khi\u1EBFt." }
    ]
  }
};
var redEarthStories = [
  {
    id: "re-1",
    tag: "Ngh\u1EC7 nh\xE2n Chi\xEAng Knah",
    title: "Ng\u01B0\u1EDDi gi\u1EEF l\u1EEDa b\xEAn b\u1EBFp nh\xE0 d\xE0i",
    desc: "C\xE2u chuy\u1EC7n c\u1EE7a nh\u1EEFng ngh\u1EC7 nh\xE2n gi\xE0 v\u1EABn ng\xE0y \u0111\xEAm truy\u1EC1n d\u1EA1y nh\u1ECBp chi\xEAng Knah cho th\u1EBF h\u1EC7 tr\u1EBB trong bu\xF4n.",
    cta: "Nghe ngh\u1EC7 nh\xE2n k\u1EC3 chuy\u1EC7n chi\xEAng",
    offsetClass: "mt-0",
    gradient: "from-[#132A1E] to-[#8C3B2B]",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/18/Tay_Nguyen_gongs.JPG",
    themeKey: "culture",
    location: "Bu\xF4n Ako Dh\xF4ng \u2022 Bu\xF4n Ma Thu\u1ED9t",
    fullParas: [
      "Khi \xE1nh l\u1EEDa b\u1EADp b\xF9ng gi\u1EEFa gian kh\xE1ch ng\xF4i nh\xE0 d\xE0i \xCA \u0110\xEA, \u0111\xF4i b\xE0n tay g\xE2n gu\u1ED1c c\u1EE7a gi\xE0 Ama H\u2019Loan l\u1EA1i n\xE2ng niu t\u1EEBng chi\u1EBFc chi\xEAng \u0111\u1ED3ng c\u1ED5. V\u1EDBi \xF4ng, m\u1ED7i chi\u1EBFc chi\xEAng trong b\u1ED9 chi\xEAng Knah \u0111\u1EC1u c\xF3 linh h\u1ED3n v\xE0 ti\u1EBFng n\xF3i ri\xEAng \u2014 t\u1EEB chi\u1EBFc chi\xEAng c\xE1i tr\u1EA7m h\xF9ng d\u1EABn nh\u1ECBp \u0111\u1EBFn nh\u1EEFng chi\u1EBFc chi\xEAng con ng\xE2n vang nh\u01B0 ti\u1EBFng su\u1ED1i reo.",
      "Su\u1ED1t h\u01A1n b\u1ED1n th\u1EADp k\u1EF7, \xF4ng mi\u1EC7t m\xE0i m\u1EDF l\u1EDBp truy\u1EC1n d\u1EA1y \u0111\xE1nh chi\xEAng mi\u1EC5n ph\xED cho thanh thi\u1EBFu ni\xEAn trong bu\xF4n v\xE0o m\u1ED7i t\u1ED1i cu\u1ED1i tu\u1EA7n, \u0111\u1EC3 thanh \xE2m \u0111\u1EA1i ng\xE0n kh\xF4ng bao gi\u1EDD \u0111\u1EE9t \u0111o\u1EA1n gi\u1EEFa nh\u1ECBp s\u1ED1ng hi\u1EC7n \u0111\u1EA1i."
    ],
    quote: "\u201CC\xF2n ti\u1EBFng chi\xEAng ng\xE2n b\xEAn b\u1EBFp l\u1EEDa l\xE0 c\xF2n h\u1ED3n c\u1ED1t c\u1EE7a ng\u01B0\u1EDDi \xCA \u0110\xEA tr\xEAn \u0111\u1EA5t \u0111\u1ECF bazan.\u201D"
  },
  {
    id: "re-2",
    tag: "M\xF9a Hoa Th\xE1ng Ba",
    title: "Gi\u1ECDt s\u01B0\u01A1ng tr\xEAn hoa c\xE0 ph\xEA th\xE1ng Ba",
    desc: "Khi c\u1EA3 cao nguy\xEAn ph\u1EE7 m\u1ED9t m\xE0u tr\u1EAFng tinh kh\xF4i v\xE0 h\u01B0\u01A1ng hoa ng\u1ECDt ng\xE0o \u0111\xE1nh th\u1EE9c t\u1EEBng \u0111\xE0n ong \u0111i l\u1EA5y m\u1EADt.",
    cta: "D\u1EA1o b\u01B0\u1EDBc gi\u1EEFa m\xF9a hoa tr\u1EAFng",
    offsetClass: "mt-7",
    gradient: "from-[#1D3B2A] to-[#B08968]",
    image: "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1000&q=80",
    themeKey: "coffee",
    location: "C\u01B0 M\u2019gar \u2022 \u0110\u1EAFk L\u1EAFk",
    fullParas: [
      "Sau \u0111\u1EE3t t\u01B0\u1EDBi n\u01B0\u1EDBc \u0111\u1EA7u xu\xE2n, ch\u1EC9 sau v\xE0i \u0111\xEAm, h\xE0ng tr\u0103m ngh\xECn hecta c\xE0 ph\xEA kh\u1EAFp \u0110\u1EAFk L\u1EAFk \u0111\u1ED3ng lo\u1EA1t bung n\u1EDF. Nh\u1EEFng ch\xF9m hoa tr\u1EAFng mu\u1ED1t k\u1EBFt th\xE0nh t\u1EEBng d\u1EA3i d\xE0i d\u1ECDc theo c\xE0nh c\xE0 ph\xEA, t\u1ECFa h\u01B0\u01A1ng th\u01A1m thanh khi\u1EBFt nh\u01B0 hoa nh\xE0i quy\u1EC7n c\xF9ng n\u1EAFng s\u1EDBm cao nguy\xEAn.",
      "\u0110\xF3 c\u0169ng l\xE0 m\xF9a nh\u1EEFng ng\u01B0\u1EDDi nu\xF4i ong di c\u01B0 \u0111\u01B0a \u0111\xE0n ong v\u1EC1 \u0111\u1EB7t d\u01B0\u1EDBi t\xE1n c\xE0 ph\xEA, t\u1EA1o n\xEAn th\u1EE9 m\u1EADt ong hoa c\xE0 ph\xEA v\xE0ng \xF3ng, s\xE1nh \u0111\u1EB7c mang h\u01B0\u01A1ng v\u1ECB \u0111\u1EB7c tr\u01B0ng kh\xF4ng n\u01A1i n\xE0o c\xF3 \u0111\u01B0\u1EE3c."
    ],
    quote: "\u201CTh\xE1ng Ba \u1EDF Ban M\xEA, ch\u1EC9 c\u1EA7n m\u1EDF c\u1EEDa s\u1ED5 bu\u1ED5i s\u1EDBm l\xE0 th\u1EA5y c\u1EA3 m\u1ED9t tr\u1EDDi tuy\u1EBFt tr\u1EAFng th\u01A1m n\u1ED3ng h\u01B0\u01A1ng m\u1EADt.\u201D"
  },
  {
    id: "re-3",
    tag: "Huy\u1EC1n Tho\u1EA1i D\xF2ng S\xF4ng",
    title: "D\xF2ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c v\xE0 k\xFD \u1EE9c b\u1EA3n \u0110\xF4n",
    desc: "L\u1EAFng nghe nh\u1EEFng giai tho\u1EA1i v\u1EC1 d\xF2ng s\xF4ng huy\u1EC1n tho\u1EA1i \xF4m tr\u1ECDn bao th\u1EBF h\u1EC7 ng\u01B0\u1EDDi M'n\xF4ng, \xCA \u0110\xEA.",
    cta: "L\u1EA7n theo huy\u1EC1n tho\u1EA1i s\xF4ng ng\u01B0\u1EE3c",
    offsetClass: "mt-2",
    gradient: "from-[#0F2419] to-[#2C4A3E]",
    image: "https://images.unsplash.com/photo-1575346571914-171503f16cc4?auto=format&fit=crop&w=1000&q=80",
    themeKey: "nature",
    location: "Bu\xF4n \u0110\xF4n \u2022 L\u01B0u v\u1EF1c S\xEAr\xEAp\u1ED1k",
    fullParas: [
      "H\u1EE3p l\u01B0u t\u1EEB hai d\xF2ng s\xF4ng Kr\xF4ng Ana (s\xF4ng C\xE1i) v\xE0 Kr\xF4ng N\xF4 (s\xF4ng \u0110\u1EF1c), s\xF4ng S\xEAr\xEAp\u1ED1k kh\xF4ng \u0111\u1ED5 ra bi\u1EC3n \u0110\xF4ng m\xE0 ch\u1EA3y ng\u01B0\u1EE3c v\u1EC1 ph\xEDa T\xE2y h\xF2a v\xE0o d\xF2ng M\xEA K\xF4ng. Ch\xEDnh s\u1EF1 k\u1EF3 th\xFA c\u1EE7a \u0111\u1ECBa h\xECnh \u1EA5y \u0111\xE3 nu\xF4i d\u01B0\u1EE1ng bao truy\u1EC1n thuy\u1EBFt h\xE0o h\xF9ng c\u1EE7a v\xF9ng \u0111\u1EA5t B\u1EA3n \u0110\xF4n.",
      "D\u01B0\u1EDBi nh\u1EEFng r\u1EB7ng si c\u1ED5 th\u1EE5 r\u1EE7 b\xF3ng xu\u1ED1ng b\u1EBFn n\u01B0\u1EDBc, k\xFD \u1EE9c v\u1EC1 nh\u1EEFng ng\u01B0\u1EDDi s\u0103n voi huy\u1EC1n tho\u1EA1i v\xE0 ngh\u1EC7 thu\u1EADt chung s\u1ED1ng h\xE0i h\xF2a v\u1EDBi thi\xEAn nhi\xEAn v\u1EABn \u0111\u01B0\u1EE3c k\u1EC3 l\u1EA1i qua t\u1EEBng th\u1EBF h\u1EC7."
    ],
    quote: "\u201CD\xF2ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c nh\u01B0 t\xEDnh c\xE1ch ph\xF3ng kho\xE1ng, m\u1EA1nh m\u1EBD c\u1EE7a con ng\u01B0\u1EDDi cao nguy\xEAn.\u201D"
  },
  {
    id: "re-4",
    tag: "Th\u1ED5 C\u1EA9m Truy\u1EC1n Th\u1ED1ng",
    title: "\u0110\xF4i tay d\u1EC7t th\u1ED5 c\u1EA9m d\u01B0\u1EDBi hi\xEAn nh\xE0",
    desc: "T\u1EEBng s\u1EE3i ch\u1EC9 nhu\u1ED9m m\xE0u v\u1ECF c\xE2y r\u1EEBng k\u1EBFt tinh th\xE0nh hoa v\u0103n k\u1EC3 chuy\u1EC7n n\xFAi s\xF4ng tr\xEAn t\u1EA5m Kpan.",
    cta: "Kh\xE1m ph\xE1 m\u1EADt m\xE3 hoa v\u0103n Kpan",
    offsetClass: "mt-9",
    gradient: "from-[#8C3B2B] to-[#3B1E14]",
    image: "https://images.unsplash.com/photo-1766875127679-00a421f8e126?auto=format&fit=crop&w=1000&q=80",
    themeKey: "culture",
    location: "Bu\xF4n T\u01A1ng J\xFA \u2022 Ea Kao",
    fullParas: [
      "B\xEAn khung d\u1EC7t truy\u1EC1n th\u1ED1ng \u0111\u1EB7t d\u01B0\u1EDBi hi\xEAn nh\xE0 d\xE0i, ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF \xCA \u0110\xEA ki\xEAn nh\u1EABn lu\u1ED3n t\u1EEBng s\u1EE3i ch\u1EC9 b\xF4ng \u0111\u01B0\u1EE3c nhu\u1ED9m t\u1EEB v\u1ECF c\xE2y k\u01A1-nia, c\u1EE7 n\xE2u v\xE0 l\xE1 ch\xE0m r\u1EEBng. Kh\xF4ng c\u1EA7n b\u1EA3n v\u1EBD gi\u1EA5y, m\u1ECDi hoa v\u0103n h\xECnh thoi, d\xE3y n\xFAi, con chim hay b\u1EADc c\u1EA7u thang \u0111\u1EC1u n\u1EB1m tr\u1ECDn trong tr\xED nh\u1EDB.",
      "M\u1ED7i t\u1EA5m th\u1ED5 c\u1EA9m ho\xE0n th\xE0nh c\xF3 th\u1EC3 m\u1EA5t h\xE0ng th\xE1ng tr\u1EDDi, mang theo l\u1EDDi ch\xFAc b\xECnh an v\xE0 ni\u1EC1m t\u1EF1 h\xE0o c\u1EE7a ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF T\xE2y Nguy\xEAn."
    ],
    quote: "\u201CM\u1ED7i \u0111\u01B0\u1EDDng d\u1EC7t Kteh l\xE0 m\u1ED9t c\xE2u chuy\u1EC7n n\xFAi s\xF4ng \u0111\u01B0\u1EE3c vi\u1EBFt b\u1EB1ng s\u1EE3i b\xF4ng v\xE0 s\u1EAFc m\xE0u c\u1EE7a r\u1EEBng.\u201D"
  },
  {
    id: "re-5",
    tag: "B\xECnh Minh H\u1ED3 L\u1EAFk",
    title: "M\u1ED9t s\u1EDBm b\xECnh minh tr\xEAn m\u1EB7t h\u1ED3 L\u1EAFk",
    desc: "Ti\u1EBFng m\xE1i ch\xE8o \u0111\u1ED9c m\u1ED9c khua nh\u1EB9 l\xE0n s\u01B0\u01A1ng m\u1EDD khi nh\u1EEFng tia n\u1EAFng \u0111\u1EA7u ti\xEAn ch\u1EA1m \u0111\u1EC9nh Ch\u01B0 Yang Sin.",
    cta: "Ch\xE8o \u0111\u1ED9c m\u1ED9c \u0111\xF3n b\xECnh minh",
    offsetClass: "mt-1",
    gradient: "from-[#182E22] to-[#D48C46]",
    image: "https://images.unsplash.com/photo-1669172463013-0c9a13d75bb4?auto=format&fit=crop&w=1000&q=80",
    themeKey: "coffee",
    location: "Bu\xF4n Jun \u2022 Huy\u1EC7n L\u1EAFk",
    fullParas: [
      "L\xFAc 5 gi\u1EDD 30 s\xE1ng, m\u1EB7t h\u1ED3 L\u1EAFk r\u1ED9ng h\u01A1n 500 hecta v\u1EABn c\xF2n ch\xECm trong l\u1EDBp s\u01B0\u01A1ng b\u1EA3ng l\u1EA3ng. T\u1EEB b\u1EBFn thuy\u1EC1n Bu\xF4n Jun, nh\u1EEFng chi\u1EBFc thuy\u1EC1n \u0111\u1ED9c m\u1ED9c \u0111\u1EBDo t\u1EEB nguy\xEAn th\xE2n c\xE2y sao c\u1ED5 th\u1EE5 l\u1EB7ng l\u1EBD r\u1EBD n\u01B0\u1EDBc.",
      "Khi \xE1nh n\u1EAFng b\xECnh minh \u0111\u1EA7u ti\xEAn v\u01B0\u1EE3t qua \u0111\u1EC9nh Ch\u01B0 Yang Sin chi\u1EBFu r\u1ECDi xu\u1ED1ng m\u1EB7t n\u01B0\u1EDBc ph\u1EB3ng l\u1EB7ng nh\u01B0 g\u01B0\u01A1ng, c\u1EA3 kh\xF4ng gian b\u1EEBng l\xEAn s\u1EAFc v\xE0ng h\u1ED5 ph\xE1ch \u0111\u1EA7y m\xEA ho\u1EB7c."
    ],
    quote: "\u201CTr\xEAn chi\u1EBFc thuy\u1EC1n \u0111\u1ED9c m\u1ED9c gi\u1EEFa s\u01B0\u01A1ng s\u1EDBm H\u1ED3 L\u1EAFk, th\u1EDDi gian d\u01B0\u1EDDng nh\u01B0 ng\u1EEBng tr\xF4i.\u201D"
  },
  {
    id: "re-6",
    tag: "Th\u1EBF H\u1EC7 N\xF4ng D\xE2n Tr\u1EBB",
    title: "V\u1ECB \u0111\u1EAFng thanh tao c\u1EE7a c\xE0 ph\xEA rang m\u1ED9c",
    desc: "H\xE0nh tr\xECnh c\u1EE7a nh\u1EEFng ng\u01B0\u1EDDi n\xF4ng d\xE2n tr\u1EBB b\u1ECF ph\u1ED1 v\u1EC1 r\u1EEBng, n\xE2ng t\u1EA7m gi\xE1 tr\u1ECB h\u1EA1t Robusta \u0110\u1EAFk L\u1EAFk.",
    cta: "G\u1EB7p nh\u1EEFng ng\u01B0\u1EDDi tr\u1EBB gi\u1EEF r\u1EABy",
    offsetClass: "mt-8",
    gradient: "from-[#2C1E16] to-[#132A1E]",
    image: "https://images.unsplash.com/photo-1565276002627-8dd8ae39a98b?auto=format&fit=crop&w=1000&q=80",
    themeKey: "coffee",
    location: "Ea T\xE2n \u2022 Kr\xF4ng N\u0103ng",
    fullParas: [
      "R\u1EDDi b\u1ECF nh\u1ECBp s\u1ED1ng h\u1ED1i h\u1EA3 n\u01A1i \u0111\xF4 th\u1ECB, nhi\u1EC1u ng\u01B0\u1EDDi tr\u1EBB \u0110\u1EAFk L\u1EAFk \u0111\xE3 tr\u1EDF v\u1EC1 ch\xEDnh khu v\u01B0\u1EDDn c\u1EE7a gia \u0111\xECnh \u0111\u1EC3 thay \u0111\u1ED5i c\xE1ch l\xE0m c\xE0 ph\xEA truy\u1EC1n th\u1ED1ng. H\u1ECD ki\xEAn tr\xEC h\xE1i ch\xEDn 100%, x\xE2y d\u1EF1ng nh\xE0 k\xEDnh ph\u01A1i gi\xE0n v\xE0 ghi ch\xE9p t\u1EC9 m\u1EC9 t\u1EEBng m\u1EBB l\xEAn men.",
      "Nh\u1EDD \u0111\xF3, h\u1EA1t Robusta \u0110\u1EAFk L\u1EAFk h\xF4m nay kh\xF4ng c\xF2n ch\u1EC9 l\xE0 nguy\xEAn li\u1EC7u th\xF4 m\xE0 \u0111\xE3 tr\u1EDF th\xE0nh ni\u1EC1m t\u1EF1 h\xE0o c\u1EE7a c\xE0 ph\xEA \u0111\u1EB7c s\u1EA3n Vi\u1EC7t Nam."
    ],
    quote: "\u201CKhi b\u1EA1n tr\xE2n tr\u1ECDng t\u1EEBng tr\xE1i c\xE0 ph\xEA ch\xEDn \u0111\u1ECF, \u0111\u1EA5t bazan s\u1EBD tr\u1EA3 l\u1EA1i h\u01B0\u01A1ng v\u1ECB ng\u1ECDt ng\xE0o nh\u1EA5t.\u201D"
  },
  {
    id: "re-7",
    tag: "T\xEDn Ng\u01B0\u1EE1ng Ngu\u1ED3n N\u01B0\u1EDBc",
    title: "M\xF9a l\u1EC5 c\xFAng b\u1EBFn n\u01B0\u1EDBc \u0111\u1EA7u n\u0103m",
    desc: "Nghi th\u1EE9c thi\xEAng li\xEAng t\u1EA1 \u01A1n th\u1EA7n ngu\u1ED3n n\u01B0\u1EDBc \u0111\xE3 ban cho bu\xF4n l\xE0ng m\xF9a m\xE0ng t\u01B0\u01A1i t\u1ED1t v\xE0 b\xECnh an.",
    cta: "T\xECm hi\u1EC3u nghi l\u1EC5 Kpin Ea",
    offsetClass: "mt-3",
    gradient: "from-[#132A1E] to-[#3A5A40]",
    image: "https://images.unsplash.com/photo-1444290679983-dd3aabf671ec?auto=format&fit=crop&w=1000&q=80",
    themeKey: "culture",
    location: "B\u1EBFn n\u01B0\u1EDBc c\u1ED5 \u2022 Bu\xF4n Ma Thu\u1ED9t",
    fullParas: [
      "V\u1EDBi ng\u01B0\u1EDDi \xCA \u0110\xEA, b\u1EBFn n\u01B0\u1EDBc \u0111\u1EA7u bu\xF4n l\xE0 m\u1EA1ch s\u1ED1ng thi\xEAng li\xEAng g\u1EAFn k\u1EBFt c\u1EA3 c\u1ED9ng \u0111\u1ED3ng. Sau m\xF9a thu ho\u1EA1ch, bu\xF4n l\xE0ng l\u1EA1i t\u1ED5 ch\u1EE9c l\u1EC5 c\xFAng b\u1EBFn n\u01B0\u1EDBc (Kpin Ea) \u0111\u1EC3 t\u1EA1 \u01A1n th\u1EA7n n\u01B0\u1EDBc v\xE0 nh\u1EAFc nh\u1EDF con ch\xE1u gi\u1EEF g\xECn r\u1EEBng \u0111\u1EA7u ngu\u1ED3n xanh m\xE1t.",
      "Ti\u1EBFng chi\xEAng r\u1ED9n r\xE3 h\xF2a c\xF9ng d\xF2ng n\u01B0\u1EDBc m\xE1t l\xE0nh ch\u1EA3y qua \u1ED1ng l\u1ED3 \xF4 t\u1EA1o n\xEAn b\u1EE9c tranh v\u0103n h\xF3a nguy\xEAn b\u1EA3n \u0111\u1EA7y s\u1EE9c s\u1ED1ng."
    ],
    quote: "\u201CGi\u1EEF cho r\u1EEBng \u0111\u1EA7u ngu\u1ED3n xanh c\u0169ng ch\xEDnh l\xE0 gi\u1EEF cho d\xF2ng n\u01B0\u1EDBc c\u1EE7a bu\xF4n l\xE0ng m\xE3i ch\u1EA3y.\u201D"
  },
  {
    id: "re-8",
    tag: "Nh\u1EA1c C\u1EE5 N\xFAi R\u1EEBng",
    title: "Giai \u0111i\u1EC7u \u0111\xE0n T'r\u01B0ng gi\u1EEFa \u0111\u1EA1i ng\xE0n",
    desc: "\xC2m thanh trong tr\u1EBBo nh\u01B0 ti\u1EBFng su\u1ED1i reo \u0111\u01B0\u1EE3c t\u1EA1o n\xEAn t\u1EEB nh\u1EEFng \u1ED1ng tre n\u1EE9a m\u1ED9c m\u1EA1c c\u1EE7a n\xFAi r\u1EEBng.",
    cta: "C\u1EA3m nh\u1EADn thanh \xE2m tre n\u1EE9a",
    offsetClass: "mt-6",
    gradient: "from-[#5C3A21] to-[#182E22]",
    image: "https://images.unsplash.com/photo-1649262763778-c70fda642ae9?auto=format&fit=crop&w=1000&q=80",
    themeKey: "culture",
    location: "Cao nguy\xEAn \u0110\u1EAFk L\u1EAFk",
    fullParas: [
      "\u0110\u01B0\u1EE3c ch\u1EBF t\xE1c t\u1EEB nh\u1EEFng \u1ED1ng tre, \u1ED1ng n\u1EE9a gi\xE0 ph\u01A1i kh\xF4 tr\xEAn g\xE1c b\u1EBFp, \u0111\xE0n T\u2019r\u01B0ng mang \xE2m s\u1EAFc trong v\u1EAFt, r\u1ED9n r\xE0ng nh\u01B0 ti\u1EBFng th\xE1c \u0111\u1ED5, ti\u1EBFng gi\xF3 l\xF9a qua r\u1EB7ng tre n\u1EE9a \u0111\u1EA1i ng\xE0n.",
      "D\u01B0\u1EDBi \u0111\xF4i tay \u0111i\xEAu luy\u1EC7n c\u1EE7a ngh\u1EC7 nh\xE2n b\u1EA3n \u0111\u1ECBa, nh\u1EEFng \u1ED1ng tre m\u1ED9c m\u1EA1c c\u1EA5t l\xEAn b\u1EA3n h\xF2a ca \u0111\u1EA7y l\u1EA1c quan v\u1EC1 t\xECnh y\xEAu thi\xEAn nhi\xEAn v\xE0 cu\u1ED9c s\u1ED1ng bu\xF4n l\xE0ng."
    ],
    quote: "\u201C\u0110\xE0n T\u2019r\u01B0ng l\xE0 ti\u1EBFng su\u1ED1i r\u1EEBng h\xF3a th\xE0nh \xE2m nh\u1EA1c trong b\xE0n tay ng\u01B0\u1EDDi T\xE2y Nguy\xEAn.\u201D"
  }
];

// src/data/places.ts
var dakLakPlaceDirectory = [
  {
    title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA",
    location: "\u0110\u01B0\u1EDDng Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u \u2022 TP. BMT",
    x: 405,
    y: 172,
    lat: 12.69086,
    lng: 108.04471,
    googleMapsQuery: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "B\u1EA3o t\xE0ng & C\xE0 ph\xEA",
    rating: "4.8",
    reviews: "3.420",
    duration: "1.5 \u2013 2 gi\u1EDD",
    period: "Gi\u1EEFa s\xE1ng",
    time: "09:30 \u2013 11:30",
    image: "https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=600&q=80",
    desc: "Chi\xEAm ng\u01B0\u1EE1ng ki\u1EBFn tr\xFAc m\xE1i v\xF2m nh\xE0 d\xE0i \xCA \u0110\xEA \u0111\u01B0\u01A1ng \u0111\u1EA1i v\xE0 h\u01A1n 10.000 hi\u1EC7n v\u1EADt v\u0103n minh c\xE0 ph\xEA to\xE0n c\u1EA7u."
  },
  {
    title: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn",
    location: "163 L\xFD Th\xE1i T\u1ED5 \u2022 TP. BMT",
    x: 362,
    y: 186,
    lat: 12.701056,
    lng: 108.061103,
    googleMapsQuery: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn, 163 L\xFD Th\xE1i T\u1ED5, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "Kh\xF4ng gian C\xE0 ph\xEA",
    rating: "4.7",
    reviews: "2.180",
    duration: "1.5 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "08:00 \u2013 09:30",
    image: "https://images.unsplash.com/photo-1565276002627-8dd8ae39a98b?auto=format&fit=crop&w=600&q=80",
    desc: "Qu\u1EA7n th\u1EC3 ki\u1EBFn tr\xFAc g\u1ED7 c\u1ED5 v\xE0 v\u01B0\u1EDDn c\xE0 ph\xEA c\u1ED5 th\u1EE5 gi\u1EEFa l\xF2ng Bu\xF4n Ma Thu\u1ED9t v\u1EDBi h\u01B0\u01A1ng v\u1ECB Robusta \u0111\u1EB7c s\u1EA3n."
  },
  {
    title: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng",
    location: "Cu\u1ED1i \u0111\u01B0\u1EDDng Tr\u1EA7n Nh\u1EADt Du\u1EADt \u2022 BMT",
    x: 392,
    y: 150,
    lat: 12.6964,
    lng: 108.0478,
    googleMapsQuery: "Bu\xF4n Ak\xF4 \u0110h\xF4ng, Tr\u1EA7n Nh\u1EADt Du\u1EADt, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "Di s\u1EA3n B\u1EA3n \u0111\u1ECBa",
    rating: "4.8",
    reviews: "1.540",
    duration: "2 gi\u1EDD",
    period: "Bu\u1ED5i chi\u1EC1u",
    time: "14:30 \u2013 16:30",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Dan_toc_hoc_19.jpg",
    desc: "Ng\xF4i bu\xF4n gi\xE0u truy\u1EC1n th\u1ED1ng nh\u1EA5t BMT v\u1EDBi h\xE0ng ch\u1EE5c n\u1EBFp nh\xE0 d\xE0i m\u1EABu h\u1EC7 nguy\xEAn b\u1EA3n d\u01B0\u1EDBi t\xE1n c\xE2y \u0111\u1EA7u ngu\u1ED3n."
  },
  {
    title: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk",
    location: "S\u1ED1 12 L\xEA Du\u1EA9n \u2022 TP. BMT",
    x: 378,
    y: 196,
    lat: 12.6715,
    lng: 108.0535,
    googleMapsQuery: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk, 12 L\xEA Du\u1EA9n, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "B\u1EA3o t\xE0ng V\u0103n h\xF3a",
    rating: "4.7",
    reviews: "980",
    duration: "1.5 \u2013 2 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "08:30 \u2013 10:30",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/18/Tay_Nguyen_gongs.JPG",
    desc: "Tr\u01B0ng b\xE0y b\u1ED9 s\u01B0u t\u1EADp chi\xEAng \u0111\u1ED3ng c\u1ED5, th\u1ED5 c\u1EA9m Kteh v\xE0 \u0111a d\u1EA1ng sinh h\u1ECDc cao nguy\xEAn \u0110\u1EAFk L\u1EAFk."
  },
  {
    title: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n",
    location: "Huy\u1EC7n Kr\xF4ng N\u0103ng \u2022 Ea T\xE2n",
    x: 472,
    y: 92,
    lat: 12.94694,
    lng: 108.36111,
    googleMapsQuery: "X\xE3 Ea T\xE2n, Kr\xF4ng N\u0103ng, \u0110\u1EAFk L\u1EAFk",
    category: "Tr\u1EA3i nghi\u1EC7m N\xF4ng tr\u1EA1i",
    rating: "4.9",
    reviews: "410",
    duration: "2.5 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "07:30 \u2013 10:30",
    image: "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=600&q=80",
    desc: "Thu h\xE1i tr\xE1i ch\xEDn, xem ph\u01A1i gi\xE0n nh\xE0 k\xEDnh v\xE0 th\u1EED n\u1EBFm (cupping) c\xE1c m\u1EBB Fine Robusta rang m\u1EDBi."
  },
  {
    title: "\u0110\xE1 Voi M\u1EB9 Yang Tao",
    location: "X\xE3 Yang Tao \u2022 Qu\u1ED1c l\u1ED9 27",
    x: 478,
    y: 256,
    lat: 12.48139,
    lng: 108.23306,
    googleMapsQuery: "\u0110\xE1 Voi M\u1EB9, Yang Tao, L\u1EAFk, \u0110\u1EAFk L\u1EAFk",
    category: "Th\u1EAFng c\u1EA3nh Thi\xEAn nhi\xEAn",
    rating: "4.7",
    reviews: "1.120",
    duration: "1 gi\u1EDD",
    period: "Bu\u1ED5i tr\u01B0a",
    time: "11:30 \u2013 12:45",
    image: "https://images.unsplash.com/photo-1677741447050-e166cf1a1f14?auto=format&fit=crop&w=600&q=80",
    desc: "T\u1EA3ng \u0111\xE1 nguy\xEAn kh\u1ED1i l\u1EDBn nh\u1EA5t Vi\u1EC7t Nam v\u1EDBi t\u1EA7m nh\xECn to\xE0n c\u1EA3nh thung l\u0169ng l\xFAa d\u01B0\u1EDBi ch\xE2n Ch\u01B0 Yang Sin."
  },
  {
    title: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun",
    location: "Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n \u2022 Huy\u1EC7n L\u1EAFk",
    x: 545,
    y: 315,
    lat: 12.42167,
    lng: 108.18194,
    googleMapsQuery: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun, Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk",
    category: "H\u1ED3 t\u1EF1 nhi\xEAn & V\u0103n h\xF3a",
    rating: "4.8",
    reviews: "1.890",
    duration: "2.5 gi\u1EDD",
    period: "S\xE1ng s\u1EDBm / Chi\u1EC1u",
    time: "05:45 \u2013 08:15",
    image: "https://images.unsplash.com/photo-1669172463013-0c9a13d75bb4?auto=format&fit=crop&w=600&q=80",
    desc: "H\u1ED3 n\u01B0\u1EDBc ng\u1ECDt t\u1EF1 nhi\xEAn r\u1ED9ng 500ha, n\u01A1i l\xFD t\u01B0\u1EDFng \u0111\u1EC3 ch\xE8o thuy\u1EC1n \u0111\u1ED9c m\u1ED9c \u0111\xF3n s\u01B0\u01A1ng mai v\xE0 giao l\u01B0u M\u2019n\xF4ng."
  },
  {
    title: "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i",
    location: "\u0110\u1ED3i Li\xEAn S\u01A1n \u2022 H\u1ED3 L\u1EAFk",
    x: 515,
    y: 288,
    lat: 12.426,
    lng: 108.176,
    googleMapsQuery: "Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i H\u1ED3 L\u1EAFk, Li\xEAn S\u01A1n, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk",
    category: "Di t\xEDch L\u1ECBch s\u1EED",
    rating: "4.6",
    reviews: "640",
    duration: "1 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "08:30 \u2013 09:45",
    image: "https://images.unsplash.com/photo-1444290679983-dd3aabf671ec?auto=format&fit=crop&w=600&q=80",
    desc: "Dinh th\u1EF1 c\u1ED5 tr\xEAn \u0111\u1EC9nh \u0111\u1ED3i cao v\u1EDBi g\xF3c nh\xECn 360 \u0111\u1ED9 bao tr\u1ECDn m\u1EB7t g\u01B0\u01A1ng H\u1ED3 L\u1EAFk v\xE0 c\xE1nh \u0111\u1ED3ng l\xFAa."
  },
  {
    title: "Th\xE1c Dray Nur H\xF9ng V\u0129",
    location: "X\xE3 Dray S\xE1p \u2022 Kr\xF4ng Ana",
    x: 268,
    y: 285,
    lat: 12.5028,
    lng: 107.925,
    googleMapsQuery: "Th\xE1c Dray Nur, Dray S\xE1p, Kr\xF4ng Ana, \u0110\u1EAFk L\u1EAFk",
    category: "Th\xE1c n\u01B0\u1EDBc & Sinh th\xE1i",
    rating: "4.8",
    reviews: "2.650",
    duration: "2.5 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "08:00 \u2013 11:00",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Draynur_falls.jpg",
    desc: "B\u1EE9c t\u01B0\u1EDDng n\u01B0\u1EDBc tr\u1EAFng x\xF3a r\u1ED9ng 250m tr\xEAn s\xF4ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c c\xF9ng h\u1EC7 th\u1ED1ng c\u1EA7u treo v\xE0 hang \u0111\xE1 bazan."
  },
  {
    title: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n",
    location: "X\xE3 Kr\xF4ng Na \u2022 Bu\xF4n \u0110\xF4n",
    x: 132,
    y: 112,
    lat: 12.8038,
    lng: 107.6707,
    googleMapsQuery: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n, Kr\xF4ng Na, Bu\xF4n \u0110\xF4n, \u0110\u1EAFk L\u1EAFk",
    category: "V\u01B0\u1EDDn Qu\u1ED1c gia",
    rating: "4.9",
    reviews: "890",
    duration: "3.5 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "07:30 \u2013 11:00",
    image: "https://images.unsplash.com/photo-1575346571914-171503f16cc4?auto=format&fit=crop&w=600&q=80",
    desc: "Tr\u1EA3i nghi\u1EC7m \u0111i b\u1ED9 th\xE2n thi\u1EC7n c\xF9ng voi t\u1EF1 nhi\xEAn d\u01B0\u1EDBi t\xE1n r\u1EEBng kh\u1ED9p r\u1EE5ng l\xE1 m\xF9a kh\xF4 \u0111\u1ED9c nh\u1EA5t Vi\u1EC7t Nam."
  },
  {
    title: "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA",
    location: "X\xE3 Ea Kao \u2022 TP. BMT",
    x: 342,
    y: 235,
    lat: 12.608,
    lng: 108.055,
    googleMapsQuery: "Bu\xF4n T\u01A1ng J\xFA, X\xE3 Ea Kao, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "L\xE0ng ngh\u1EC1 Th\u1EE7 c\xF4ng",
    rating: "4.7",
    reviews: "320",
    duration: "1.5 gi\u1EDD",
    period: "Bu\u1ED5i chi\u1EC1u",
    time: "15:00 \u2013 16:45",
    image: "https://images.unsplash.com/photo-1766875127679-00a421f8e126?auto=format&fit=crop&w=600&q=80",
    desc: "Xem ngh\u1EC7 nh\xE2n nhu\u1ED9m s\u1EE3i b\xF4ng b\u1EB1ng v\u1ECF c\xE2y r\u1EEBng v\xE0 t\u1EF1 tay d\u1EC7t th\u1EED hoa v\u0103n h\xECnh h\u1ECDc truy\u1EC1n th\u1ED1ng Kteh."
  },
  {
    title: "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t",
    location: "Trung t\xE2m TP. Bu\xF4n Ma Thu\u1ED9t",
    x: 372,
    y: 194,
    lat: 12.6816,
    lng: 108.0398,
    googleMapsQuery: "\u0110\u01B0\u1EDDng Phan \u0110\xECnh Gi\xF3t, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "\u1EA8m th\u1EF1c B\u1EA3n \u0111\u1ECBa",
    rating: "4.8",
    reviews: "1.430",
    duration: "1.5 gi\u1EDD",
    period: "Bu\u1ED5i t\u1ED1i",
    time: "18:30 \u2013 20:30",
    image: "https://images.unsplash.com/photo-1648141643305-efb7d2542602?auto=format&fit=crop&w=600&q=80",
    desc: "Th\u01B0\u1EDFng th\u1EE9c b\xFAn \u0111\u1ECF Ban M\xEA, b\xE1nh \u01B0\u1EDBt th\u1ECBt n\u01B0\u1EDBng ch\u1ED3ng \u0111\u0129a v\xE0 c\xE0 ph\xEA v\u1EE3t n\xF3ng h\u1ED5i d\u01B0\u1EDBi ti\u1EBFt tr\u1EDDi se l\u1EA1nh."
  },
  {
    title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n",
    location: "Khu du l\u1ECBch Bu\xF4n \u0110\xF4n",
    x: 175,
    y: 138,
    lat: 12.875,
    lng: 107.817,
    googleMapsQuery: "Trung t\xE2m du l\u1ECBch C\u1EA7u treo Bu\xF4n \u0110\xF4n, Kr\xF4ng Na, \u0110\u1EAFk L\u1EAFk",
    category: "V\u0103n h\xF3a & S\xF4ng n\u01B0\u1EDBc",
    rating: "4.6",
    reviews: "1.760",
    duration: "1.5 gi\u1EDD",
    period: "Bu\u1ED5i tr\u01B0a",
    time: "12:00 \u2013 14:00",
    image: "https://images.unsplash.com/photo-1649262763778-c70fda642ae9?auto=format&fit=crop&w=600&q=80",
    desc: "D\u1EA1o b\u01B0\u1EDBc qua nh\u1EEFng nh\u1ECBp c\u1EA7u treo tre l\u1EAFc l\u01B0 d\u01B0\u1EDBi v\xF2m r\u1EC5 si c\u1ED5 th\u1EE5 v\xE0 th\u01B0\u1EDFng th\u1EE9c g\xE0 n\u01B0\u1EDBng c\u01A1m lam."
  }
];

// server/services/core/auth.ts
import crypto from "node:crypto";
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, stored) {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  const result = {};
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}
async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = /* @__PURE__ */ new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1e3);
  const expiresAt = expires.toISOString();
  const createdAt = now.toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("sessions").insert({
      token,
      user_id: userId,
      expires_at: expiresAt,
      created_at: createdAt
    });
    if (error) {
      throw new Error(`Failed to create session in Supabase: ${error.message}`);
    }
    return { token, expiresAt };
  }
  const db = getDb();
  db.prepare(
    "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).run(token, userId, expiresAt, createdAt);
  return { token, expiresAt };
}
async function deleteSession(token) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    await supabase.from("sessions").delete().eq("token", token);
    return;
  }
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
function extractSessionTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string") {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  const headerToken = req.headers["x-cms-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}
async function getAuthUserFromRequest(req) {
  const token = extractSessionTokenFromRequest(req);
  if (!token) return null;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: sessionRow, error } = await supabase.from("sessions").select(
      "token, expires_at, user:users(id, email, display_name, role, is_active)"
    ).eq("token", token).maybeSingle();
    if (error || !sessionRow) return null;
    const rawUser = Array.isArray(sessionRow.user) ? sessionRow.user[0] : sessionRow.user;
    if (!rawUser) return null;
    const userRow = rawUser;
    const isActive = userRow.is_active === true || userRow.is_active === 1;
    if (new Date(sessionRow.expires_at).getTime() < Date.now() || !isActive) {
      await supabase.from("sessions").delete().eq("token", token);
      return null;
    }
    return {
      id: Number(userRow.id),
      email: userRow.email,
      displayName: userRow.display_name,
      role: userRow.role,
      isActive: true
    };
  }
  const db = getDb();
  const row = db.prepare(
    `SELECT u.id, u.email, u.display_name, u.role, u.is_active, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
  ).get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now() || row.is_active !== 1) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active === 1
  };
}
async function attachOptionalAuth(req, _res, next) {
  try {
    req.authUser = await getAuthUserFromRequest(req) || void 0;
    next();
  } catch (err) {
    next(err);
  }
}
async function requireAuth(req, res, next) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 truy c\u1EADp c\u1ED5ng qu\u1EA3n tr\u1ECB." });
      return;
    }
    req.authUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
function requireAdmin(req, res, next) {
  if (!req.authUser) {
    res.status(401).json({ error: "Ch\u01B0a x\xE1c th\u1EF1c ng\u01B0\u1EDDi d\xF9ng." });
    return;
  }
  if (req.authUser.role !== "admin") {
    res.status(403).json({ error: "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y." });
    return;
  }
  next();
}

// server/services/core/slugify.ts
function slugifyVietnamese(input) {
  const cleaned = (input || "").toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
  return cleaned || `bai-viet-${Date.now()}`;
}
async function ensureUniqueSlug(rawTitleOrSlug, excludePostId) {
  const base = slugifyVietnamese(rawTitleOrSlug);
  let candidate = base;
  let counter = 2;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    while (true) {
      let query = supabase.from("posts").select("id").eq("slug", candidate).limit(1);
      if (excludePostId) {
        query = query.neq("id", excludePostId);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(`Supabase slug check failed: ${error.message}`);
      }
      if (!data || data.length === 0) return candidate;
      candidate = `${base}-${counter}`;
      counter += 1;
    }
  }
  const db = getDb();
  while (true) {
    const existing = excludePostId ? db.prepare("SELECT id FROM posts WHERE slug = ? AND id != ?").get(candidate, excludePostId) : db.prepare("SELECT id FROM posts WHERE slug = ?").get(candidate);
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

// server/db/seedEn.ts
var seedBentoEn = {
  coffee: {
    title: "World Coffee Capital: From Basalt Red Soil to Sensory Fine Robusta",
    excerpt: "Journey from endless basalt coffee farms to the World Coffee Museum and an authentic Fine Robusta cup that awakens every sense.",
    category: "Coffee Capital",
    location: "Bu\xF4n Ma Thu\u1ED9t \u2022 C\u01B0 M\u2019gar \u2022 Ea T\xE2n",
    readTime: "5 min read",
    cta: "Explore the Robusta journey",
    previewParagraphs: [
      "At 500\u2013800 meters above sea level, \u0110\u1EAFk L\u1EAFk\u2019s fertile basalt red soil\u2014enriched by ancient volcanic eruptions\u2014creates a sanctuary for Robusta coffee. Beyond leading Vietnam in output, Bu\xF4n Ma Thu\u1ED9t is now pioneering a proud Fine Robusta specialty wave.",
      "At the World Coffee Museum, whose sweeping silhouette echoes traditional \xCA \u0110\xEA longhouses, visitors trace global coffee civilization before savoring a honey-processed Robusta with deep dark-chocolate notes."
    ],
    contentHtml: `
      <p>At 500\u2013800 meters above sea level, \u0110\u1EAFk L\u1EAFk\u2019s fertile basalt red soil\u2014enriched by ancient volcanic eruptions\u2014creates a sanctuary for Robusta coffee. Beyond leading Vietnam in output, Bu\xF4n Ma Thu\u1ED9t is now pioneering a proud Fine Robusta specialty wave.</p>
      <h2>From Red Basalt Hills to Specialty Roasteries</h2>
      <p>Across C\u01B0 M\u2019gar and Ea T\xE2n, a new generation of farmers selectively picks only 100% ripe red cherries, drying them slowly on raised beds under highland sun. The result overturns every stereotype about Robusta: layered sweetness, roasted hazelnut, and lingering cacao warmth.</p>
      <p>At the World Coffee Museum, whose sweeping silhouette echoes traditional \xCA \u0110\xEA longhouses, visitors trace global coffee civilization before savoring a honey-processed Robusta with deep dark-chocolate notes.</p>
    `,
    quote: "\u201CEvery cup of Bu\xF4n Ma Thu\u1ED9t coffee holds the essence of highland sun, wind, and the patience of farming hands.\u201D",
    quoteSource: "\u2014 National Geographical Indication for Bu\xF4n Ma Thu\u1ED9t Coffee",
    glossary: [
      {
        term: "Fine Robusta",
        def: "CQI-certified specialty Robusta prized for dark chocolate, roasted nut notes, and sweet finish."
      },
      {
        term: "World Coffee Museum",
        def: "Contemporary architectural landmark in Bu\xF4n Ma Thu\u1ED9t preserving over 10,000 coffee artifacts."
      }
    ]
  },
  gong: {
    title: "Space of Gong Culture: Resonances of the Great Forest Around R\u01B0\u1EE3u C\u1EA7n",
    excerpt: "A UNESCO Intangible Cultural Heritage of Humanity where highland bronze gongs echo beside jars of fermented rice wine in village nights.",
    category: "Human Heritage",
    location: "\xCA \u0110\xEA & M\u2019n\xF4ng Villages \u2022 \u0110\u1EAFk L\u1EAFk",
    readTime: "6 min read",
    cta: "Listen to forest resonances",
    previewParagraphs: [
      "In the spiritual life of the \xCA \u0110\xEA and M\u2019n\xF4ng peoples of \u0110\u1EAFk L\u1EAFk, bronze gongs bridge humanity with the deities (Y\xE0ng) and the natural world. From ear-blowing rites for newborns to new-rice festivals and water-wharf prayers, the Knah gong ensemble stands at the heart of every ceremony.",
      "Gathering by a crackling fire inside a longhouse, sipping herb-fermented r\u01B0\u1EE3u c\u1EA7n rice wine while listening to deep gong cadences is when travelers touch the true soul of the Central Highlands."
    ],
    contentHtml: `
      <p>In the spiritual life of the \xCA \u0110\xEA and M\u2019n\xF4ng peoples of \u0110\u1EAFk L\u1EAFk, bronze gongs bridge humanity with the deities (Y\xE0ng) and the natural world. From ear-blowing rites for newborns to new-rice festivals and water-wharf prayers, the Knah gong ensemble stands at the heart of every ceremony.</p>
      <h2>The Living Dialogue of Bronze and Firelight</h2>
      <p>Each gong in a traditional ensemble carries its own voice and role, passing melodies from player to player like flowing mountain streams. Gathering by a crackling fire inside a longhouse, sipping herb-fermented r\u01B0\u1EE3u c\u1EA7n while listening to deep gong cadences is when travelers touch the true soul of the Central Highlands.</p>
    `,
    quote: "\u201CWherever the gongs resound, the sacred spirit of the great forest awakens.\u201D",
    quoteSource: "\u2014 Space of Gong Culture in the Central Highlands (UNESCO)",
    glossary: [
      {
        term: "Knah Gong Set",
        def: "Traditional \xCA \u0110\xEA bronze gong ensemble featuring tuned gongs of varied sizes and pitches."
      },
      {
        term: "R\u01B0\u1EE3u c\u1EA7n",
        def: "Communal rice wine fermented with forest leaf yeast inside antique earthenware jars."
      }
    ]
  },
  matriarchy: {
    title: "Matriarchal Heritage: \xCA \u0110\xEA Longhouse Architecture & Carved Stairways",
    excerpt: "Distinctive beauty in \xCA \u0110\xEA longhouse architecture, crescent-carved mother stairways, and the gentle authority of highland women.",
    category: "Matriarchal Culture",
    location: "Bu\xF4n Ako Dh\xF4ng \u2022 Bu\xF4n Ma Thu\u1ED9t",
    readTime: "6 min read",
    cta: "Step inside the Longhouse",
    previewParagraphs: [
      "Under \xCA \u0110\xEA matriarchal tradition, women keep the family hearth and the youngest daughter inherits the ancestral home to care for her parents. Each time a daughter marries and welcomes her husband into the household, the timber longhouse extends by another structural bay.",
      "At the front porch, the main stairway is hand-carved from a single tree trunk bearing twin breasts and a crescent moon \u2014 a dignified tribute to maternal roots."
    ],
    contentHtml: `
      <p>Under \xCA \u0110\xEA matriarchal tradition, women keep the family hearth and the youngest daughter inherits the ancestral home to care for her parents. Each time a daughter marries and welcomes her husband into the household, the timber longhouse extends by another structural bay.</p>
      <h2>Architecture That Grows With Generations</h2>
      <p>At the front porch, the main stairway is hand-carved from a single tree trunk bearing twin breasts and a crescent moon \u2014 a dignified tribute to maternal roots. Inside the welcoming hall stretches the monumental Kpan bench, carved from a single forest tree for ceremonial gong musicians.</p>
    `,
    quote: "\u201CAn \xCA \u0110\xEA longhouse grows with every marriage, sheltering generations of memory beneath one thatched roof.\u201D",
    quoteSource: "\u2014 Indigenous Cultural Archives of Bu\xF4n Ako Dh\xF4ng",
    glossary: [
      {
        term: "Main Stairway",
        def: "Single-trunk wooden stairs carved with maternal motifs honoring \xCA \u0110\xEA women."
      },
      {
        term: "Kpan Bench",
        def: "Monolithic 10\u201320m wooden bench placed along the guest hall wall for gong performers."
      }
    ]
  },
  waterfalls: {
    title: "Wonders of Waterfalls & Natural Lakes: From Mighty Dray Nur to Serene Lake L\u1EAFk",
    excerpt: "A dramatic contrast between the 250m cascading curtain of Dray Nur \u2013 Dray S\xE1p and twilight reflections on Lake L\u1EAFk\u2019s dugout canoes.",
    category: "Natural Wonders",
    location: "S\xEAr\xEAp\u1ED1k River & L\u1EAFk District",
    readTime: "5 min read",
    cta: "Explore waterfalls & lakes",
    previewParagraphs: [
      "\u0110\u1EAFk L\u1EAFk holds two captivating faces of nature: the roaring majesty of the Dray Nur \u2013 Dray S\xE1p \u2013 Gia Long waterfalls along the westward-flowing S\xEAr\xEAp\u1ED1k River, and the mirror-like stillness of 500-hectare Lake L\u1EAFk resting beneath Ch\u01B0 Yang Sin.",
      "Travelers can spend the morning trekking beneath basalt mist and the afternoon paddling a wooden dugout canoe into violet-gold lake twilight."
    ],
    contentHtml: `
      <p>\u0110\u1EAFk L\u1EAFk holds two captivating faces of nature: the roaring majesty of the Dray Nur \u2013 Dray S\xE1p \u2013 Gia Long waterfalls along the westward-flowing S\xEAr\xEAp\u1ED1k River, and the mirror-like stillness of 500-hectare Lake L\u1EAFk resting beneath Ch\u01B0 Yang Sin.</p>
      <h2>Roaring Basalt Cascades & Mirror Waters</h2>
      <p>Travelers can spend the morning trekking forest trails beneath roaring curtains of white water and the afternoon gliding across Lake L\u1EAFk in a hand-carved dugout canoe beside M\u2019n\xF4ng R\u2019l\xE2m lakeside villages.</p>
    `,
    quote: "\u201COn one side, a symphony of water and basalt rock; on the other, a tranquil mirror reflecting highland skies.\u201D",
    quoteSource: "\u2014 \u0110\u1EAFk L\u1EAFk Eco-Discovery Guidebook",
    glossary: [
      {
        term: "Dray Nur Waterfall",
        def: "One of the Central Highlands\u2019 grandest falls with a 250m-wide wall of cascading water."
      },
      {
        term: "Lake L\u1EAFk",
        def: "The largest natural freshwater lake in the Central Highlands, home to M\u2019n\xF4ng R\u2019l\xE2m villages."
      }
    ]
  },
  bandon: {
    title: "Legends of B\u1EA3n \u0110\xF4n & Forest Elephants: Memories Along the S\xEAr\xEAp\u1ED1k River",
    excerpt: "Where \xCA \u0110\xEA, M\u2019n\xF4ng, and Lao cultures meet along the S\xEAr\xEAp\u1ED1k River, walking under Yok \u0110\xF4n dipterocarp forests with ethical elephant care.",
    category: "Highland Legends",
    location: "Bu\xF4n \u0110\xF4n \u2022 Yok \u0110\xF4n National Park",
    readTime: "5 min read",
    cta: "Uncover B\u1EA3n \u0110\xF4n legends",
    previewParagraphs: [
      "Nestled along the legendary S\xEAr\xEAp\u1ED1k River, B\u1EA3n \u0110\xF4n has long been celebrated for the elephant-taming heritage of its M\u2019n\xF4ng, \xCA \u0110\xEA, and Lao communities.",
      "Today, the region writes a humane new chapter through elephant-friendly ecotourism in Yok \u0110\xF4n National Park \u2014 walking quietly beneath dry dipterocarp canopies to observe elephants roaming freely."
    ],
    contentHtml: `
      <p>Nestled along the legendary S\xEAr\xEAp\u1ED1k River, B\u1EA3n \u0110\xF4n has long been celebrated for the elephant-taming heritage of its M\u2019n\xF4ng, \xCA \u0110\xEA, and Lao communities.</p>
      <h2>A Humane New Chapter in Yok \u0110\xF4n</h2>
      <p>Today, the region writes a compassionate new chapter through elephant-friendly ecotourism in Yok \u0110\xF4n National Park \u2014 walking quietly beneath dry dipterocarp canopies to observe elephants foraging naturally without riding.</p>
    `,
    quote: "\u201CIn B\u1EA3n \u0110\xF4n, elephants were never merely property; they were cherished companions like members of the family.\u201D",
    quoteSource: "\u2014 Bu\xF4n \u0110\xF4n Chronicles by the S\xEAr\xEAp\u1ED1k River",
    glossary: [
      {
        term: "Yok \u0110\xF4n Dipterocarp Forest",
        def: "Vietnam\u2019s only protected dry deciduous dipterocarp forest ecosystem."
      },
      {
        term: "Elephant-Friendly Tourism",
        def: "No-riding observation experiences respecting animal welfare and natural habitats."
      }
    ]
  },
  cuisine: {
    title: "Symphony of Highland Cuisine: Rustic Forest Flavors Awakening the Palate",
    excerpt: "Awaken your taste buds with B\u1EA3n \u0110\xF4n grilled chicken with green chili salt, bamboo-tube sticky rice, S\xEAr\xEAp\u1ED1k catfish, and sweet l\xE1 b\xE9p soup.",
    category: "Local Gastronomy",
    location: "Bu\xF4n Ma Thu\u1ED9t \u2022 B\u1EA3n \u0110\xF4n \u2022 Lake L\u1EAFk",
    readTime: "4 min read",
    cta: "Savor mountain flavors",
    previewParagraphs: [
      "\u0110\u1EAFk L\u1EAFk cuisine harmonizes wild mountain ingredients with rustic hearth cooking: free-range B\u1EA3n \u0110\xF4n grilled chicken dipped in green bird\u2019s-eye chili salt, fragrant bamboo-tube c\u01A1m lam sticky rice, and fresh catfish from the S\xEAr\xEAp\u1ED1k River.",
      "Unforgettable local signatures include sweet wild l\xE1 b\xE9p leaf soup with stream shrimp and savory pounded bitter eggplant."
    ],
    contentHtml: `
      <p>\u0110\u1EAFk L\u1EAFk cuisine harmonizes wild mountain ingredients with rustic hearth cooking: free-range B\u1EA3n \u0110\xF4n grilled chicken dipped in green bird\u2019s-eye chili salt, fragrant bamboo-tube c\u01A1m lam sticky rice, and fresh catfish from the S\xEAr\xEAp\u1ED1k River.</p>
      <h2>From Longhouse Hearths to Street-Side Plates</h2>
      <p>Unforgettable local signatures include sweet wild l\xE1 b\xE9p leaf soup simmered with stream shrimp, bitter eggplant pounded with weaver-ant salt, and hot charcoal-grilled pork skewers enjoyed in cool evening mist.</p>
    `,
    quote: "\u201CEvery highland dish carries the fragrance of longhouse hearth smoke and the crisp freshness of the forest.\u201D",
    quoteSource: "\u2014 \u0110\u1EAFk L\u1EAFk Culinary Atlas",
    glossary: [
      {
        term: "L\xE1 b\xE9p soup",
        def: "Naturally sweet wild forest greens cooked with stream shrimp or smoked meat."
      },
      {
        term: "C\u01A1m lam",
        def: "Upland glutinous rice soaked in spring water and slow-roasted inside young bamboo tubes."
      }
    ]
  }
};
var seedStoriesEn = {
  "re-1": {
    title: "Keepers of the Fire Inside the Longhouse",
    excerpt: "The devotion of elder gong artisans who tirelessly pass down Knah gong rhythms to village youth night after night.",
    category: "Knah Gong Artisan",
    location: "Bu\xF4n Ako Dh\xF4ng \u2022 Bu\xF4n Ma Thu\u1ED9t",
    readTime: "5 min read",
    cta: "Hear the gong keeper\u2019s story",
    previewParagraphs: [
      "As firelight flickers in the welcoming hall of the \xCA \u0110\xEA longhouse, elder Ama H\u2019Loan\u2019s weathered hands cradle each antique bronze gong. To him, every gong in the Knah ensemble holds its own spirit and voice.",
      "For over four decades, he has taught free weekend gong classes to village youth so the voice of the great forest never fades."
    ],
    contentHtml: `
      <p>As firelight flickers in the welcoming hall of the \xCA \u0110\xEA longhouse, elder Ama H\u2019Loan\u2019s weathered hands cradle each antique bronze gong. To him, every gong in the Knah ensemble holds its own spirit and voice \u2014 from the deep lead gong setting the pulse to smaller gongs shimmering like forest streams.</p>
      <p>For over four decades, he has taught free weekend gong classes to village youth so the voice of the great forest never fades amid modern life.</p>
    `,
    quote: "\u201CAs long as the gongs ring beside the hearth, the soul of the \xCA \u0110\xEA endures on this red basalt land.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n Ako Dh\xF4ng",
    glossary: [
      {
        term: "Suggested Experience",
        def: "Visit Bu\xF4n Ako Dh\xF4ng in the early evening to hear live gong ensembles around the hearth."
      },
      {
        term: "Trip Integration",
        def: "Easily pair with a 2D1N or 3D2N cultural itinerary in Bu\xF4n Ma Thu\u1ED9t."
      }
    ]
  },
  "re-2": {
    title: "Morning Dew on March Coffee Blossoms",
    excerpt: "When the entire plateau turns snowy white and sweet floral fragrance beckons migratory honeybees.",
    category: "March Blossom Season",
    location: "C\u01B0 M\u2019gar \u2022 \u0110\u1EAFk L\u1EAFk",
    readTime: "5 min read",
    cta: "Stroll through white blossoms",
    previewParagraphs: [
      "After the first spring irrigation, hundreds of thousands of hectares of coffee across \u0110\u1EAFk L\u1EAFk burst into bloom over a few nights. Clusters of snow-white blossoms blanket the branches with a jasmine-like perfume.",
      "It is also the season when migratory beekeepers place hives beneath the canopy to harvest golden coffee-blossom honey."
    ],
    contentHtml: `
      <p>After the first spring irrigation, hundreds of thousands of hectares of coffee across \u0110\u1EAFk L\u1EAFk burst into bloom over a few nights. Clusters of snow-white blossoms blanket the branches with a jasmine-like perfume riding the morning breeze.</p>
      <p>It is also the season when migratory beekeepers place hives beneath the canopy to harvest golden, richly aromatic coffee-blossom honey found nowhere else.</p>
    `,
    quote: "\u201CIn March around Ban M\xEA, opening your window at dawn reveals an ocean of fragrant white snow.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 C\u01B0 M\u2019gar",
    glossary: [
      {
        term: "Peak Bloom Window",
        def: "Typically late February to March right after the first orchard watering."
      }
    ]
  },
  "re-3": {
    title: "The Westward-Flowing S\xEAr\xEAp\u1ED1k & B\u1EA3n \u0110\xF4n Memories",
    excerpt: "Legends of the mythic river that flows inland and embraces generations of M\u2019n\xF4ng and \xCA \u0110\xEA life.",
    category: "River Legends",
    location: "Bu\xF4n \u0110\xF4n \u2022 S\xEAr\xEAp\u1ED1k Basin",
    readTime: "5 min read",
    cta: "Follow the reverse river legend",
    previewParagraphs: [
      "Formed by the confluence of Kr\xF4ng Ana (Mother River) and Kr\xF4ng N\xF4 (Father River), the S\xEAr\xEAp\u1ED1k flows westward into the Mekong rather than east to the sea, inspiring heroic legends across B\u1EA3n \u0110\xF4n.",
      "Under ancient banyan trees overhanging the riverbank, tales of legendary elephant guardians and living in harmony with nature are passed down through generations."
    ],
    contentHtml: `
      <p>Formed by the confluence of Kr\xF4ng Ana (Mother River) and Kr\xF4ng N\xF4 (Father River), the S\xEAr\xEAp\u1ED1k flows westward into the Mekong rather than east to the sea, inspiring heroic legends across B\u1EA3n \u0110\xF4n.</p>
      <p>Under ancient banyan trees overhanging the riverbank, tales of legendary elephant guardians and living in harmony with nature are passed down through generations.</p>
    `,
    quote: "\u201CThe S\xEAr\xEAp\u1ED1k flows counter to the current, just like the bold, free spirit of highland people.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n \u0110\xF4n",
    glossary: [
      {
        term: "Kr\xF4ng Ana & Kr\xF4ng N\xF4",
        def: "The twin rivers whose confluence forms the legendary S\xEAr\xEAp\u1ED1k."
      }
    ]
  },
  "re-4": {
    title: "Brocade Weaving Hands Beneath the Porch",
    excerpt: "Forest-bark dyed cotton threads woven into rhythmic motifs narrating mountains and rivers on Kpan cloth.",
    category: "Traditional Brocade",
    location: "Bu\xF4n T\u01A1ng J\xFA \u2022 Ea Kao",
    readTime: "5 min read",
    cta: "Decode Kpan weaving motifs",
    previewParagraphs: [
      "At her back-strap loom under the longhouse eaves, an \xCA \u0110\xEA weaver patiently threads cotton dyed with k\u01A1-nia bark, wild brown tubers, and indigo leaves. Without paper sketches, every diamond, mountain ridge, and stair motif lives in memory.",
      "A single finished textile can take months, carrying blessings of peace and highland pride."
    ],
    contentHtml: `
      <p>At her back-strap loom under the longhouse eaves, an \xCA \u0110\xEA weaver patiently threads cotton dyed with k\u01A1-nia bark, wild brown tubers, and indigo leaves. Without paper sketches, every diamond, mountain ridge, and stair motif lives in memory.</p>
      <p>A single finished textile can take months, carrying blessings of peace and the quiet pride of highland women.</p>
    `,
    quote: "\u201CEvery Kteh weave is a story of mountains and rivers written in cotton and forest colors.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n T\u01A1ng J\xFA",
    glossary: [
      {
        term: "Kteh Brocade",
        def: "Traditional handwoven \xCA \u0110\xEA cotton fabric colored with natural forest dyes."
      }
    ]
  },
  "re-5": {
    title: "Dawn Breaking Over Lake L\u1EAFk",
    excerpt: "Dugout paddles parting silver mist as the first sunbeams brush the summit of Ch\u01B0 Yang Sin.",
    category: "Lake L\u1EAFk Sunrise",
    location: "Bu\xF4n Jun \u2022 L\u1EAFk District",
    readTime: "5 min read",
    cta: "Paddle into sunrise mist",
    previewParagraphs: [
      "At 5:30 AM, 500-hectare Lake L\u1EAFk still slumbers beneath drifting silver mist. From Bu\xF4n Jun landing, dugout canoes carved from ancient sao tree trunks glide silently across the water.",
      "When sunrise crests Ch\u01B0 Yang Sin peak, the mirror-calm lake ignites in luminous amber gold."
    ],
    contentHtml: `
      <p>At 5:30 AM, 500-hectare Lake L\u1EAFk still slumbers beneath drifting silver mist. From Bu\xF4n Jun landing, dugout canoes carved from ancient sao tree trunks glide silently across the water.</p>
      <p>When sunrise crests Ch\u01B0 Yang Sin peak, the mirror-calm lake ignites in luminous amber gold\u2014a moment where time itself seems to pause.</p>
    `,
    quote: "\u201CIn a dugout canoe amidst Lake L\u1EAFk morning mist, time seems to stand completely still.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n Jun",
    glossary: [
      {
        term: "Bu\xF4n Jun Landing",
        def: "Lakeside M\u2019n\xF4ng village offering early-morning traditional dugout canoe rides."
      }
    ]
  },
  "re-6": {
    title: "The Refined Bitterness of Pure-Roasted Coffee",
    excerpt: "Young growers leaving big cities to return to family farms and elevate \u0110\u1EAFk L\u1EAFk\u2019s Robusta beans.",
    category: "Young Farmers",
    location: "Ea T\xE2n \u2022 Kr\xF4ng N\u0103ng",
    readTime: "5 min read",
    cta: "Meet young farm guardians",
    previewParagraphs: [
      "Leaving behind fast-paced city life, young people from \u0110\u1EAFk L\u1EAFk are returning to their family orchards to transform traditional coffee cultivation\u2014picking only ripe red cherries, building solar drying greenhouses, and logging every fermentation batch.",
      "Thanks to their craft, \u0110\u1EAFk L\u1EAFk Robusta has become a proud ambassador of Vietnamese specialty coffee."
    ],
    contentHtml: `
      <p>Leaving behind fast-paced city life, young people from \u0110\u1EAFk L\u1EAFk are returning to their family orchards to transform traditional coffee cultivation\u2014picking only ripe red cherries, building solar drying greenhouses, and logging every fermentation batch.</p>
      <p>Thanks to their craft, \u0110\u1EAFk L\u1EAFk Robusta has stepped beyond commodity bulk to become a proud ambassador of Vietnamese specialty coffee.</p>
    `,
    quote: "\u201CWhen you honor every ripe coffee cherry, the basalt earth rewards you with its sweetest cup.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Ea T\xE2n",
    glossary: [
      {
        term: "Solar Raised-Bed Drying",
        def: "Controlled drying inside greenhouses that protects clean sweetness and fruity aromatics."
      }
    ]
  },
  "re-7": {
    title: "The New Year Water-Wharf Thanksgiving Rite",
    excerpt: "A sacred ceremony thanking the water spirits for blessing the village with bountiful harvests and peace.",
    category: "Water-Wharf Belief",
    location: "Ancient Water Wharf \u2022 Bu\xF4n Ma Thu\u1ED9t",
    readTime: "5 min read",
    cta: "Discover the Kpin Ea rite",
    previewParagraphs: [
      "To the \xCA \u0110\xEA people, the village water wharf is the sacred lifeline uniting the community. After the harvest, villagers gather for the Kpin Ea water-wharf ceremony to thank the water spirits and remind younger generations to protect headwater forests.",
      "Lively gong rhythms blend with cool spring water flowing through bamboo spouts."
    ],
    contentHtml: `
      <p>To the \xCA \u0110\xEA people, the village water wharf is the sacred lifeline uniting the community. After the harvest, villagers gather for the Kpin Ea water-wharf ceremony to thank the water spirits and remind younger generations to protect headwater forests.</p>
      <p>Lively gong rhythms blend with cool spring water flowing through bamboo spouts in a vibrant celebration of ecological stewardship.</p>
    `,
    quote: "\u201CKeeping the headwater forest green is how we keep the village spring flowing forever.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n Ma Thu\u1ED9t",
    glossary: [
      {
        term: "Kpin Ea Ceremony",
        def: "Annual \xCA \u0110\xEA thanksgiving ritual honoring water sources and forest conservation."
      }
    ]
  },
  "re-8": {
    title: "Melodies of the T\u2019r\u01B0ng Xylophone in the Great Forest",
    excerpt: "Crystal-clear tones like cascading forest brooks crafted from humble fire-cured bamboo tubes.",
    category: "Forest Instruments",
    location: "\u0110\u1EAFk L\u1EAFk Highlands",
    readTime: "5 min read",
    cta: "Feel the bamboo melodies",
    previewParagraphs: [
      "Crafted from mature bamboo tubes cured over kitchen hearths, the T\u2019r\u01B0ng produces bright, rippling notes reminiscent of mountain waterfalls and wind rustling through highland bamboo groves.",
      "Under an artisan\u2019s nimble mallets, simple bamboo tubes sing an optimistic hymn to nature and village life."
    ],
    contentHtml: `
      <p>Crafted from mature bamboo tubes cured over kitchen hearths, the T\u2019r\u01B0ng produces bright, rippling notes reminiscent of mountain waterfalls and wind rustling through highland bamboo groves.</p>
      <p>Under an artisan\u2019s nimble mallets, simple bamboo tubes sing an optimistic hymn to nature and village life.</p>
    `,
    quote: "\u201CThe T\u2019r\u01B0ng is a forest stream transformed into music in the hands of highland artisans.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Central Highlands",
    glossary: [
      {
        term: "T\u2019r\u01B0ng Xylophone",
        def: "Traditional highland bamboo percussion instrument tuned by cutting graduated tube lengths."
      }
    ]
  }
};

// server/db/seed.ts
function paragraphsToHtml(paragraphs) {
  return paragraphs.map((p) => `<p>${p}</p>`).join("\n");
}
var INITIAL_STAYS = [
  {
    name: "Homestay Nh\xE0 D\xE0i Ako Dh\xF4ng",
    area: "BMT",
    tier: "budget",
    nightlyRateVnd: 45e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["solo", "couple", "friends"],
    amenities: ["Ki\u1EBFn tr\xFAc nh\xE0 d\xE0i \xCA \u0110\xEA", "Wi-Fi", "C\xE0 ph\xEA rang m\u1ED9c bu\u1ED5i s\xE1ng"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu homestay trung t\xE2m BMT"
  },
  {
    name: "Zan Homestay V\u01B0\u1EDDn Ea Kao",
    area: "Ea Kao",
    tier: "budget",
    nightlyRateVnd: 52e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["solo", "couple", "friends"],
    amenities: ["Kh\xF4ng gian v\u01B0\u1EDDn c\xE0 ph\xEA y\xEAn t\u0129nh", "B\u1EBFp chung", "H\u1ED7 tr\u1EE3 thu\xEA xe m\xE1y"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu homestay khu v\u1EF1c h\u1ED3 Ea Kao"
  },
  {
    name: "Elephants Hotel Bu\xF4n Ma Thu\u1ED9t",
    area: "BMT",
    tier: "standard",
    nightlyRateVnd: 115e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["solo", "couple", "family", "friends"],
    amenities: ["Trung t\xE2m BMT", "Buffet s\xE1ng", "H\u1ED3 b\u01A1i & ph\xF2ng gia \u0111\xECnh"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu kh\xE1ch s\u1EA1n 4 sao trung t\xE2m BMT"
  },
  {
    name: "L\u1EAFk Tented Camp Bungalow",
    area: "H\u1ED3 L\u1EAFk",
    tier: "standard",
    nightlyRateVnd: 145e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["couple", "family", "friends"],
    amenities: ["View m\u1EB7t h\u1ED3 L\u1EAFk", "Ch\xE8o kayak b\xECnh minh", "\u1EA8m th\u1EF1c b\u1EA3n \u0111\u1ECBa M\u2019n\xF4ng"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu bungalow ngh\u1EC9 d\u01B0\u1EE1ng ven H\u1ED3 L\u1EAFk"
  },
  {
    name: "M\u01B0\u1EDDng Thanh Luxury Bu\xF4n Ma Thu\u1ED9t",
    area: "BMT",
    tier: "luxury",
    nightlyRateVnd: 21e5,
    capacityMin: 1,
    capacityMax: 6,
    suitableFor: ["couple", "family", "friends"],
    amenities: ["Kh\xE1ch s\u1EA1n 5 sao", "H\u1ED3 b\u01A1i ngo\xE0i tr\u1EDDi", "\u0110\u01B0a \u0111\xF3n s\xE2n bay BMV"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu kh\xE1ch s\u1EA1n cao c\u1EA5p t\u1EA1i BMT"
  },
  {
    name: "L\u1EAFk Lake Eco-Resort & Villa",
    area: "H\u1ED3 L\u1EAFk",
    tier: "luxury",
    nightlyRateVnd: 265e4,
    capacityMin: 2,
    capacityMax: 6,
    suitableFor: ["couple", "family", "friends"],
    amenities: ["Villa ri\xEAng t\u01B0 ven h\u1ED3", "Spa th\u1EA3o m\u1ED9c T\xE2y Nguy\xEAn", "Thuy\u1EC1n \u0111\u1ED9c m\u1ED9c ri\xEAng"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu resort cao c\u1EA5p khu v\u1EF1c H\u1ED3 L\u1EAFk"
  }
];
var INITIAL_LOGISTICS = [
  {
    mode: "motorbike",
    label: "Thu\xEA xe m\xE1y (tay ga / xe s\u1ED1) t\u1EA1i BMT",
    tier: "budget",
    dailyRateVnd: 16e4,
    capacityMin: 1,
    capacityMax: 2,
    suitableFor: ["solo", "couple", "friends"],
    notes: "Linh ho\u1EA1t di chuy\u1EC3n n\u1ED9i \xF4 BMT, Ea Kao v\xE0 th\xE1c Dray Nur; ch\u01B0a g\u1ED3m x\u0103ng."
  },
  {
    mode: "local_bus_shuttle",
    label: "Xe bu\xFDt tuy\u1EBFn & Shuttle gh\xE9p \u0111i\u1EC3m",
    tier: "budget",
    dailyRateVnd: 22e4,
    capacityMin: 1,
    capacityMax: 8,
    suitableFor: ["solo", "friends"],
    notes: "Ph\xF9 h\u1EE3p tuy\u1EBFn tr\u1EE5c ch\xEDnh BMT \u2013 H\u1ED3 L\u1EAFk / Bu\xF4n \u0110\xF4n; c\u1EA7n ch\u1EE7 \u0111\u1ED9ng gi\u1EDD xu\u1EA5t b\u1EBFn."
  },
  {
    mode: "self_drive_car",
    label: "\xD4 t\xF4 4\u20135 ch\u1ED7 t\u1EF1 l\xE1i",
    tier: "standard",
    dailyRateVnd: 85e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["couple", "family", "friends"],
    notes: "Tho\u1EA3i m\xE1i cho gia \u0111\xECnh ho\u1EB7c nh\xF3m nh\u1ECF ch\u1EA1y QL27 \u0111i H\u1ED3 L\u1EAFk, Ea T\xE2n, Dray Nur."
  },
  {
    mode: "private_car_driver",
    label: "Xe ri\xEAng 7 ch\u1ED7 k\xE8m t\xE0i x\u1EBF b\u1EA3n \u0111\u1ECBa",
    tier: "luxury",
    dailyRateVnd: 165e4,
    capacityMin: 2,
    capacityMax: 6,
    suitableFor: ["couple", "family", "friends"],
    notes: "Tr\u1ECDn g\xF3i nhi\xEAn li\u1EC7u, t\xE0i x\u1EBF am hi\u1EC3u cung \u0111\u01B0\u1EDDng \u0111\xE8o d\u1ED1c v\xE0 l\u1ECBch v\u0103n h\xF3a \u0111\u1ECBa ph\u01B0\u01A1ng."
  }
];
var SEED_PLACE_PRICING = {
  "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA": {
    areaCluster: "BMT",
    ticketVnd: 15e4,
    estimatedSpendVnd: 22e4,
    priceNote: "V\xE9 tham quan b\u1EA3o t\xE0ng & tr\u1EA3i nghi\u1EC7m th\u01B0\u1EDFng th\u1EE9c c\xE0 ph\xEA t\u1EA1i qu\u1EA7y."
  },
  "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn": {
    areaCluster: "BMT",
    ticketVnd: 0,
    estimatedSpendVnd: 12e4,
    priceNote: "Mi\u1EC5n ph\xED v\xE9 v\xE0o c\u1ED5ng; chi ph\xED \u0111\u1ED3 u\u1ED1ng c\xE0 ph\xEA t\u1EA1i nh\xE0 c\u1ED5."
  },
  "Bu\xF4n c\u1ED5 Ako Dh\xF4ng": {
    areaCluster: "BMT",
    ticketVnd: 0,
    estimatedSpendVnd: 1e5,
    priceNote: "Tham quan kh\xF4ng gian bu\xF4n l\xE0ng mi\u1EC5n ph\xED; chi ph\xED c\xE0 ph\xEA ho\u1EB7c \u0111\u1EB7c s\u1EA3n nh\u1EB9."
  },
  "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk": {
    areaCluster: "BMT",
    ticketVnd: 3e4,
    estimatedSpendVnd: 5e4,
    priceNote: "V\xE9 tham quan khu tr\u01B0ng b\xE0y v\u0103n h\xF3a T\xE2y Nguy\xEAn & \u0111a d\u1EA1ng sinh h\u1ECDc."
  },
  "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n": {
    areaCluster: "Kr\xF4ng N\u0103ng",
    ticketVnd: 12e4,
    estimatedSpendVnd: 25e4,
    priceNote: "Chi ph\xED tham quan v\u01B0\u1EDDn c\xE0 ph\xEA & workshop cupping Fine Robusta."
  },
  "\u0110\xE1 Voi M\u1EB9 Yang Tao": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    ticketVnd: 2e4,
    estimatedSpendVnd: 4e4,
    priceNote: "Ph\xED g\u1EEDi xe & tham quan khu v\u1EF1c \u0110\xE1 Voi M\u1EB9 tr\xEAn tuy\u1EBFn QL27."
  },
  "H\u1ED3 L\u1EAFk & Bu\xF4n Jun": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    ticketVnd: 0,
    estimatedSpendVnd: 22e4,
    priceNote: "D\u1EA1o bu\xF4n mi\u1EC5n ph\xED; \u01B0\u1EDBc t\xEDnh chi ph\xED ch\xE8o thuy\u1EC1n \u0111\u1ED9c m\u1ED9c tr\xEAn H\u1ED3 L\u1EAFk."
  },
  "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    ticketVnd: 3e4,
    estimatedSpendVnd: 6e4,
    priceNote: "V\xE9 tham quan di t\xEDch \u0111\u1ED3i Li\xEAn S\u01A1n nh\xECn to\xE0n c\u1EA3nh H\u1ED3 L\u1EAFk."
  },
  "Th\xE1c Dray Nur H\xF9ng V\u0129": {
    areaCluster: "Dray Nur",
    ticketVnd: 4e4,
    estimatedSpendVnd: 1e5,
    priceNote: "V\xE9 v\xE0o c\u1ED5ng khu du l\u1ECBch th\xE1c Dray Nur & n\u01B0\u1EDBc u\u1ED1ng ngh\u1EC9 ch\xE2n."
  },
  "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n": {
    areaCluster: "Bu\xF4n \u0110\xF4n",
    ticketVnd: 6e4,
    estimatedSpendVnd: 85e4,
    priceNote: "V\xE9 v\xE0o v\u01B0\u1EDDn qu\u1ED1c gia & tour \u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn kh\xF4ng c\u01B0\u1EE1i voi."
  },
  "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA": {
    areaCluster: "Ea Kao",
    ticketVnd: 0,
    estimatedSpendVnd: 15e4,
    priceNote: "Tham quan nh\xE0 d\u1EC7t truy\u1EC1n th\u1ED1ng; \u01B0\u1EDBc t\xEDnh tr\u1EA3i nghi\u1EC7m d\u1EC7t ho\u1EB7c mua kh\u0103n th\u1EE7 c\xF4ng."
  },
  "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t": {
    areaCluster: "BMT",
    ticketVnd: 0,
    estimatedSpendVnd: 15e4,
    priceNote: "Ph\u1ED1 \u0111i b\u1ED9 mi\u1EC5n ph\xED; \u01B0\u1EDBc t\xEDnh b\u1EEFa \u0103n \u0111\u1EB7c s\u1EA3n b\xFAn \u0111\u1ECF, b\xE1nh \u01B0\u1EDBt & c\xE0 ph\xEA."
  },
  "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n": {
    areaCluster: "Bu\xF4n \u0110\xF4n",
    ticketVnd: 5e4,
    estimatedSpendVnd: 18e4,
    priceNote: "V\xE9 qua c\u1EA7u treo & th\u01B0\u1EDFng th\u1EE9c g\xE0 n\u01B0\u1EDBng c\u01A1m lam khu v\u1EF1c B\u1EA3n \u0110\xF4n."
  }
};
function buildInitialPostPayloads(adminId, now) {
  const rows = [];
  bentoOverviewCards.forEach((card, idx) => {
    const article = bentoArticlesData[card.articleKey];
    const en = seedBentoEn[card.articleKey];
    const slug = slugifyVietnamese(card.title);
    const sectionMeta = {
      size: card.size,
      imageLayout: card.imageLayout,
      imageBgClass: card.imageBgClass,
      isCultureHighlight: card.articleKey === "gong" || card.articleKey === "matriarchy"
    };
    rows.push({
      slug,
      legacy_key: card.articleKey,
      section: "bento",
      status: "published",
      sort_order: idx,
      author_id: adminId,
      reviewed_by: adminId,
      review_note: "",
      cover_image: card.image,
      image_alt: card.imageAlt,
      theme_key: article.themeKey,
      section_meta_json: sectionMeta,
      title: article.title,
      excerpt: card.description,
      category: article.category,
      location: article.location,
      read_time: article.readTime,
      cta_label: card.cta,
      preview_paragraphs_json: article.paragraphs,
      content_html: paragraphsToHtml(article.paragraphs),
      quote: article.quote,
      quote_source: article.quoteSource,
      glossary_json: article.glossary,
      title_en: en.title,
      excerpt_en: en.excerpt,
      category_en: en.category,
      location_en: en.location,
      read_time_en: en.readTime,
      cta_label_en: en.cta,
      preview_paragraphs_en_json: en.previewParagraphs,
      content_html_en: en.contentHtml,
      quote_en: en.quote,
      quote_source_en: en.quoteSource,
      glossary_en_json: en.glossary,
      translation_status: "translated",
      translation_provider: "seed-curated",
      translated_at: now,
      published_at: now,
      created_at: now,
      updated_at: now
    });
  });
  redEarthStories.forEach((story, idx) => {
    const en = seedStoriesEn[story.id];
    const slug = slugifyVietnamese(story.title);
    const defaultGlossary = [
      {
        term: "Tr\u1EA3i nghi\u1EC7m g\u1EE3i \xFD",
        def: `Gh\xE9 th\u0103m ${story.location} v\xE0o bu\u1ED5i s\u1EDBm \u0111\u1EC3 c\u1EA3m nh\u1EADn tr\u1ECDn v\u1EB9n nh\u1ECBp s\u1ED1ng b\u1EA3n \u0111\u1ECBa.`
      },
      {
        term: "K\u1EBFt n\u1ED1i h\xE0nh tr\xECnh",
        def: "C\xF3 th\u1EC3 t\xEDch h\u1EE3p tr\u1EF1c ti\u1EBFp v\xE0o l\u1ECBch tr\xECnh 2N1\u0110 ho\u1EB7c 3N2\u0110 t\u1EA1i \u0110\u1EAFk L\u1EAFk."
      }
    ];
    const sectionMeta = {
      gradient: story.gradient,
      offsetClass: story.offsetClass
    };
    rows.push({
      slug,
      legacy_key: story.id,
      section: "stories",
      status: "published",
      sort_order: idx,
      author_id: adminId,
      reviewed_by: adminId,
      review_note: "",
      cover_image: story.image,
      image_alt: story.title,
      theme_key: story.themeKey,
      section_meta_json: sectionMeta,
      title: story.title,
      excerpt: story.desc,
      category: story.tag,
      location: story.location,
      read_time: "5 ph\xFAt \u0111\u1ECDc",
      cta_label: story.cta,
      preview_paragraphs_json: story.fullParas,
      content_html: paragraphsToHtml(story.fullParas),
      quote: story.quote,
      quote_source: `\u2014 Chuy\u1EC7n c\u1EE7a \u0111\u1EA5t \u0111\u1ECF \u0110\u1EAFk L\u1EAFk \u2022 ${story.location}`,
      glossary_json: defaultGlossary,
      title_en: en.title,
      excerpt_en: en.excerpt,
      category_en: en.category,
      location_en: en.location,
      read_time_en: en.readTime,
      cta_label_en: en.cta,
      preview_paragraphs_en_json: en.previewParagraphs,
      content_html_en: en.contentHtml,
      quote_en: en.quote,
      quote_source_en: en.quoteSource,
      glossary_en_json: en.glossary,
      translation_status: "translated",
      translation_provider: "seed-curated",
      translated_at: now,
      published_at: now,
      created_at: now,
      updated_at: now
    });
  });
  return rows;
}
async function ensureSeedDataSupabase() {
  const supabase = getSupabaseAdmin();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { count: userCount, error: userCountErr } = await supabase.from("users").select("id", { count: "exact", head: true });
  if (userCountErr) throw new Error(`Supabase seed users count failed: ${userCountErr.message}`);
  let adminId = 1;
  if (!userCount || userCount === 0) {
    const { data: insertedUsers, error: insertUsersErr } = await supabase.from("users").insert([
      {
        email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
        display_name: "Ban Bi\xEAn T\u1EADp (Admin)",
        password_hash: hashPassword(DEFAULT_ADMIN_PASSWORD),
        role: "admin",
        is_active: true,
        created_at: now
      },
      {
        email: DEFAULT_WRITER_EMAIL.toLowerCase(),
        display_name: "T\xE1c Gi\u1EA3 Cao Nguy\xEAn",
        password_hash: hashPassword(DEFAULT_WRITER_PASSWORD),
        role: "writer",
        is_active: true,
        created_at: now
      }
    ]).select("id, role");
    if (insertUsersErr) {
      throw new Error(`Supabase seed users insert failed: ${insertUsersErr.message}`);
    }
    const adminRow = insertedUsers?.find((u) => u.role === "admin");
    if (adminRow) adminId = Number(adminRow.id);
    console.log(`[CMS Seed] Created default users in Supabase.`);
  } else {
    const { data: existingAdmin } = await supabase.from("users").select("id").eq("role", "admin").order("id", { ascending: true }).limit(1).maybeSingle();
    if (existingAdmin?.id) adminId = Number(existingAdmin.id);
  }
  const { count: postCount, error: postCountErr } = await supabase.from("posts").select("id", { count: "exact", head: true });
  if (postCountErr) throw new Error(`Supabase seed posts count failed: ${postCountErr.message}`);
  if (!postCount || postCount === 0) {
    const postRows = buildInitialPostPayloads(adminId, now);
    const { error: insertPostsErr } = await supabase.from("posts").upsert(postRows, { onConflict: "slug", ignoreDuplicates: true });
    if (insertPostsErr) {
      throw new Error(`Supabase seed posts insert failed: ${insertPostsErr.message}`);
    }
    console.log("[CMS Seed] Seeded 6 Bento posts and 8 Red Earth stories into Supabase.");
  }
  const { count: staysCount, error: staysCountErr } = await supabase.from("stays").select("id", { count: "exact", head: true });
  if (staysCountErr) throw new Error(`Supabase seed stays count failed: ${staysCountErr.message}`);
  if (!staysCount || staysCount === 0) {
    const stayRows = INITIAL_STAYS.map((stay) => ({
      name: stay.name,
      area: stay.area,
      tier: stay.tier,
      nightly_rate_vnd: stay.nightlyRateVnd,
      capacity_min: stay.capacityMin,
      capacity_max: stay.capacityMax,
      suitable_for_json: stay.suitableFor,
      amenities_json: stay.amenities,
      source_note: stay.sourceNote,
      is_active: true,
      created_at: now,
      updated_at: now
    }));
    const { error: insertStaysErr } = await supabase.from("stays").upsert(stayRows, { onConflict: "name", ignoreDuplicates: true });
    if (insertStaysErr) {
      throw new Error(`Supabase seed stays insert failed: ${insertStaysErr.message}`);
    }
    console.log(`[AI Seed] Seeded ${stayRows.length} stays into Supabase.`);
  }
  const { count: logisticsCount, error: logisticsCountErr } = await supabase.from("logistics").select("id", { count: "exact", head: true });
  if (logisticsCountErr) {
    throw new Error(`Supabase seed logistics count failed: ${logisticsCountErr.message}`);
  }
  if (!logisticsCount || logisticsCount === 0) {
    const logisticsRows = INITIAL_LOGISTICS.map((item) => ({
      mode: item.mode,
      label: item.label,
      tier: item.tier,
      daily_rate_vnd: item.dailyRateVnd,
      capacity_min: item.capacityMin,
      capacity_max: item.capacityMax,
      suitable_for_json: item.suitableFor,
      notes: item.notes,
      is_active: true,
      created_at: now,
      updated_at: now
    }));
    const { error: insertLogisticsErr } = await supabase.from("logistics").upsert(logisticsRows, { onConflict: "mode", ignoreDuplicates: true });
    if (insertLogisticsErr) {
      throw new Error(`Supabase seed logistics insert failed: ${insertLogisticsErr.message}`);
    }
    console.log(`[AI Seed] Seeded ${logisticsRows.length} logistics options into Supabase.`);
  }
  const { count: placePricesCount, error: placePricesCountErr } = await supabase.from("place_prices").select("id", { count: "exact", head: true });
  if (placePricesCountErr) {
    throw new Error(`Supabase seed place_prices count failed: ${placePricesCountErr.message}`);
  }
  if (!placePricesCount || placePricesCount === 0) {
    const placeRows = dakLakPlaceDirectory.map((place) => {
      const pricing = SEED_PLACE_PRICING[place.title] || {
        areaCluster: place.location.includes("H\u1ED3 L\u1EAFk") ? "H\u1ED3 L\u1EAFk" : place.location.includes("Ea Kao") ? "Ea Kao" : "BMT",
        ticketVnd: 3e4,
        estimatedSpendVnd: 12e4,
        priceNote: "M\u1EE9c chi ph\xED \u01B0\u1EDBc t\xEDnh tham kh\u1EA3o t\u1EA1i \u0111i\u1EC3m tham quan."
      };
      return {
        place_title: place.title,
        area_cluster: pricing.areaCluster,
        ticket_vnd: pricing.ticketVnd,
        estimated_spend_vnd: pricing.estimatedSpendVnd,
        price_source: "seed",
        price_note: pricing.priceNote,
        source_url: "",
        fetched_at: now,
        updated_at: now
      };
    });
    const { error: insertPlaceErr } = await supabase.from("place_prices").upsert(placeRows, { onConflict: "place_title", ignoreDuplicates: true });
    if (insertPlaceErr) {
      throw new Error(`Supabase seed place_prices insert failed: ${insertPlaceErr.message}`);
    }
    console.log(`[AI Seed] Seeded ${placeRows.length} place_prices into Supabase.`);
  }
}
function ensureSeedDataSqlite() {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM users").get();
  let adminId = 1;
  if (userCountRow.cnt === 0) {
    const insertUser = db.prepare(
      `INSERT INTO users (email, display_name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`
    );
    const adminResult = insertUser.run(
      DEFAULT_ADMIN_EMAIL.toLowerCase(),
      "Ban Bi\xEAn T\u1EADp (Admin)",
      hashPassword(DEFAULT_ADMIN_PASSWORD),
      "admin",
      now
    );
    adminId = Number(adminResult.lastInsertRowid);
    insertUser.run(
      DEFAULT_WRITER_EMAIL.toLowerCase(),
      "T\xE1c Gi\u1EA3 Cao Nguy\xEAn",
      hashPassword(DEFAULT_WRITER_PASSWORD),
      "writer",
      now
    );
    console.log(
      `[CMS Seed] Created default users -> Admin: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD} | Writer: ${DEFAULT_WRITER_EMAIL} / ${DEFAULT_WRITER_PASSWORD}`
    );
  } else {
    const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").get();
    if (existingAdmin) adminId = existingAdmin.id;
  }
  const postCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM posts").get();
  if (postCountRow.cnt === 0) {
    const insertPost = db.prepare(`
      INSERT INTO posts (
        slug, legacy_key, section, status, sort_order, author_id, reviewed_by, review_note,
        cover_image, image_alt, theme_key, section_meta_json,
        title, excerpt, category, location, read_time, cta_label,
        preview_paragraphs_json, content_html, quote, quote_source, glossary_json,
        title_en, excerpt_en, category_en, location_en, read_time_en, cta_label_en,
        preview_paragraphs_en_json, content_html_en, quote_en, quote_source_en, glossary_en_json,
        translation_status, translation_provider, translated_at,
        published_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, 'published', ?, ?, ?, '',
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'translated', 'seed-curated', ?,
        ?, ?, ?
      )
    `);
    const postRows = buildInitialPostPayloads(adminId, now);
    for (const row of postRows) {
      insertPost.run(
        String(row.slug),
        row.legacy_key ? String(row.legacy_key) : null,
        String(row.section),
        Number(row.sort_order),
        Number(row.author_id),
        Number(row.reviewed_by),
        String(row.cover_image),
        String(row.image_alt),
        String(row.theme_key),
        JSON.stringify(row.section_meta_json),
        String(row.title),
        String(row.excerpt),
        String(row.category),
        String(row.location),
        String(row.read_time),
        String(row.cta_label),
        JSON.stringify(row.preview_paragraphs_json),
        String(row.content_html),
        String(row.quote),
        String(row.quote_source),
        JSON.stringify(row.glossary_json),
        String(row.title_en),
        String(row.excerpt_en),
        String(row.category_en),
        String(row.location_en),
        String(row.read_time_en),
        String(row.cta_label_en),
        JSON.stringify(row.preview_paragraphs_en_json),
        String(row.content_html_en),
        String(row.quote_en),
        String(row.quote_source_en),
        JSON.stringify(row.glossary_en_json),
        now,
        now,
        now,
        now
      );
    }
    console.log("[CMS Seed] Seeded 6 Bento posts and 8 Red Earth stories into SQLite.");
  }
  const staysCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM stays").get();
  if (staysCountRow.cnt === 0) {
    const insertStay = db.prepare(`
      INSERT INTO stays (
        name, area, tier, nightly_rate_vnd, capacity_min, capacity_max,
        suitable_for_json, amenities_json, source_note, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    for (const stay of INITIAL_STAYS) {
      insertStay.run(
        stay.name,
        stay.area,
        stay.tier,
        stay.nightlyRateVnd,
        stay.capacityMin,
        stay.capacityMax,
        JSON.stringify(stay.suitableFor),
        JSON.stringify(stay.amenities),
        stay.sourceNote,
        now,
        now
      );
    }
    console.log(`[AI Seed] Seeded ${INITIAL_STAYS.length} stays into SQLite.`);
  }
  const logisticsCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM logistics").get();
  if (logisticsCountRow.cnt === 0) {
    const insertLogistics = db.prepare(`
      INSERT INTO logistics (
        mode, label, tier, daily_rate_vnd, capacity_min, capacity_max,
        suitable_for_json, notes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    for (const item of INITIAL_LOGISTICS) {
      insertLogistics.run(
        item.mode,
        item.label,
        item.tier,
        item.dailyRateVnd,
        item.capacityMin,
        item.capacityMax,
        JSON.stringify(item.suitableFor),
        item.notes,
        now,
        now
      );
    }
    console.log(`[AI Seed] Seeded ${INITIAL_LOGISTICS.length} logistics options into SQLite.`);
  }
  const placePricesCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM place_prices").get();
  if (placePricesCountRow.cnt === 0) {
    const insertPlacePrice = db.prepare(`
      INSERT INTO place_prices (
        place_title, area_cluster, ticket_vnd, estimated_spend_vnd,
        price_source, price_note, source_url, fetched_at, updated_at
      ) VALUES (?, ?, ?, ?, 'seed', ?, '', ?, ?)
    `);
    for (const place of dakLakPlaceDirectory) {
      const pricing = SEED_PLACE_PRICING[place.title] || {
        areaCluster: place.location.includes("H\u1ED3 L\u1EAFk") ? "H\u1ED3 L\u1EAFk" : place.location.includes("Ea Kao") ? "Ea Kao" : "BMT",
        ticketVnd: 3e4,
        estimatedSpendVnd: 12e4,
        priceNote: "M\u1EE9c chi ph\xED \u01B0\u1EDBc t\xEDnh tham kh\u1EA3o t\u1EA1i \u0111i\u1EC3m tham quan."
      };
      insertPlacePrice.run(
        place.title,
        pricing.areaCluster,
        pricing.ticketVnd,
        pricing.estimatedSpendVnd,
        pricing.priceNote,
        now,
        now
      );
    }
    console.log(`[AI Seed] Seeded ${dakLakPlaceDirectory.length} place_prices into SQLite.`);
  }
}
async function ensureSeedData() {
  if (isUsingSupabase()) {
    await ensureSeedDataSupabase();
    return;
  }
  ensureSeedDataSqlite();
}

// server/routes/adminPostsRoutes.ts
import { Router } from "express";

// server/services/core/errors.ts
var ServiceError = class extends Error {
  statusCode;
  code;
  constructor(statusCode, code, message) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
};
function isServiceError(err) {
  return err instanceof ServiceError;
}

// server/services/cms/postMapper.ts
function safeJsonValue(raw, fallback) {
  if (raw === null || raw === void 0) return fallback;
  if (typeof raw !== "string") {
    return raw;
  }
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function mapRowToPublicPost(row, lang) {
  const useEn = lang === "en";
  const sectionMeta = safeJsonValue(row.section_meta_json, {});
  const previewParagraphsVi = safeJsonValue(row.preview_paragraphs_json, []);
  const previewParagraphsEn = safeJsonValue(row.preview_paragraphs_en_json, []);
  const glossaryVi = safeJsonValue(row.glossary_json, []);
  const glossaryEn = safeJsonValue(row.glossary_en_json, []);
  return {
    id: Number(row.id),
    slug: row.slug,
    legacyKey: row.legacy_key,
    section: row.section,
    status: row.status,
    sortOrder: row.sort_order,
    title: useEn && row.title_en ? row.title_en : row.title,
    excerpt: useEn && row.excerpt_en ? row.excerpt_en : row.excerpt,
    category: useEn && row.category_en ? row.category_en : row.category,
    location: useEn && row.location_en ? row.location_en : row.location,
    readTime: useEn && row.read_time_en ? row.read_time_en : row.read_time,
    cta: useEn && row.cta_label_en ? row.cta_label_en : row.cta_label,
    image: row.cover_image,
    imageAlt: row.image_alt || row.title,
    themeKey: row.theme_key,
    previewParagraphs: useEn && previewParagraphsEn.length > 0 ? previewParagraphsEn : previewParagraphsVi,
    contentHtml: useEn && row.content_html_en ? row.content_html_en : row.content_html,
    quote: useEn && row.quote_en ? row.quote_en : row.quote,
    quoteSource: useEn && row.quote_source_en ? row.quote_source_en : row.quote_source,
    glossary: useEn && glossaryEn.length > 0 ? glossaryEn : glossaryVi,
    bentoConfig: row.section === "bento" ? {
      size: sectionMeta.size === "small" ? "small" : "large",
      imageLayout: sectionMeta.imageLayout === "left" ? "left" : "top",
      imageBgClass: typeof sectionMeta.imageBgClass === "string" && sectionMeta.imageBgClass ? sectionMeta.imageBgClass : "bg-[#132A1E]",
      isCultureHighlight: Boolean(sectionMeta.isCultureHighlight)
    } : void 0,
    storyConfig: row.section === "stories" ? {
      gradient: typeof sectionMeta.gradient === "string" && sectionMeta.gradient ? sectionMeta.gradient : "from-[#132A1E] to-[#8C3B2B]",
      offsetClass: typeof sectionMeta.offsetClass === "string" && sectionMeta.offsetClass ? sectionMeta.offsetClass : "mt-0"
    } : void 0,
    authorId: row.author_id !== null ? Number(row.author_id) : null,
    authorName: row.author_name || "Ban Bi\xEAn T\u1EADp \u0110\u1EAFk L\u1EAFk",
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    translationStatus: row.translation_status
  };
}
function mapRowToAdminPost(row) {
  const base = mapRowToPublicPost(row, "vi");
  return {
    ...base,
    reviewNote: row.review_note || "",
    reviewedBy: row.reviewed_by !== null ? Number(row.reviewed_by) : null,
    titleEn: row.title_en || "",
    excerptEn: row.excerpt_en || "",
    categoryEn: row.category_en || "",
    locationEn: row.location_en || "",
    readTimeEn: row.read_time_en || "",
    ctaEn: row.cta_label_en || "",
    previewParagraphsEn: safeJsonValue(row.preview_paragraphs_en_json, []),
    contentHtmlEn: row.content_html_en || "",
    quoteEn: row.quote_en || "",
    quoteSourceEn: row.quote_source_en || "",
    glossaryEn: safeJsonValue(row.glossary_en_json, []),
    translationProvider: row.translation_provider || "",
    translatedAt: row.translated_at,
    createdAt: row.created_at
  };
}
function normalizeBentoMeta(input) {
  return {
    size: input?.size === "small" ? "small" : "large",
    imageLayout: input?.imageLayout === "left" ? "left" : "top",
    imageBgClass: input?.imageBgClass || "bg-[#132A1E]",
    isCultureHighlight: Boolean(input?.isCultureHighlight)
  };
}
function normalizeStoryMeta(input) {
  return {
    gradient: input?.gradient || "from-[#132A1E] to-[#8C3B2B]",
    offsetClass: input?.offsetClass || "mt-0"
  };
}

// server/services/core/sanitize.ts
var import_sanitize_html = __toESM(require_sanitize_html(), 1);
function sanitizeRichHtml(html) {
  return (0, import_sanitize_html.default)(html || "", {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "hr",
      "figure",
      "figcaption",
      "code",
      "pre"
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["class"]
    },
    allowedSchemes: ["http", "https", "data"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    transformTags: {
      a: import_sanitize_html.default.simpleTransform("a", { rel: "noopener noreferrer" }, true)
    }
  });
}

// server/services/ai/translator.ts
var GeminiTranslationProvider = class {
  name = "gemini-ai";
  apiKey;
  model;
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }
  async translatePostToEnglish(input) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const prompt = [
      "Translate the following Vietnamese travel editorial blog post about \u0110\u1EAFk L\u1EAFk (Central Highlands, Vietnam) into natural, evocative editorial English.",
      "Rules:",
      "1. Preserve proper Vietnamese place and cultural names appropriately (e.g., \u0110\u1EAFk L\u1EAFk, Bu\xF4n Ma Thu\u1ED9t, \xCA \u0110\xEA, M\u2019n\xF4ng, S\xEAr\xEAp\u1ED1k, Dray Nur, H\u1ED3 L\u1EAFk, Yok \u0110\xF4n, Knah, Kpan, T\u2019r\u01B0ng).",
      '2. For "contentHtml", preserve ALL HTML tags, attributes (like img src, alt, href), and document structure intact \u2014 translate only human-readable text and img alt attributes.',
      "3. Return strictly valid JSON matching the exact input keys.",
      "",
      JSON.stringify(input)
    ].join("\n");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: "application/json"
        }
      })
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Gemini translation API error (${response.status}): ${errText.slice(0, 200)}`);
    }
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Gemini translation returned empty content");
    }
    const parsed = JSON.parse(rawText);
    return {
      title: parsed.title || input.title,
      excerpt: parsed.excerpt || input.excerpt,
      category: parsed.category || input.category,
      location: parsed.location || input.location,
      readTime: parsed.readTime || translateReadTimeFallback(input.readTime),
      cta: parsed.cta || "Read full story",
      previewParagraphs: Array.isArray(parsed.previewParagraphs) ? parsed.previewParagraphs : input.previewParagraphs,
      contentHtml: sanitizeRichHtml(parsed.contentHtml || input.contentHtml),
      quote: parsed.quote || input.quote,
      quoteSource: parsed.quoteSource || input.quoteSource,
      glossary: Array.isArray(parsed.glossary) ? parsed.glossary : input.glossary,
      provider: `${this.name}:${this.model}`
    };
  }
};
function translateReadTimeFallback(viReadTime) {
  const match = viReadTime.match(/\d+/);
  if (match) return `${match[0]} min read`;
  return viReadTime;
}
var LocalFallbackTranslationProvider = class {
  name = "local-fallback";
  async translatePostToEnglish(input) {
    return {
      title: input.title,
      excerpt: input.excerpt,
      category: input.category,
      location: input.location,
      readTime: translateReadTimeFallback(input.readTime),
      cta: "Explore story",
      previewParagraphs: [...input.previewParagraphs],
      contentHtml: sanitizeRichHtml(input.contentHtml),
      quote: input.quote,
      quoteSource: input.quoteSource,
      glossary: input.glossary.map((g) => ({ ...g })),
      provider: this.name
    };
  }
};
async function translatePostToEnglish(input) {
  const fallback = new LocalFallbackTranslationProvider();
  if (GEMINI_API_KEY.trim()) {
    const gemini = new GeminiTranslationProvider(GEMINI_API_KEY.trim(), GEMINI_MODEL);
    try {
      const result = await gemini.translatePostToEnglish(input);
      return { payload: result, status: "translated" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown AI translation error";
      console.warn("[CMS Translator] Gemini translation failed, using fallback:", message);
      const fbResult2 = await fallback.translatePostToEnglish(input);
      return { payload: fbResult2, status: "failed", errorMessage: message };
    }
  }
  const fbResult = await fallback.translatePostToEnglish(input);
  return { payload: fbResult, status: "translated" };
}

// server/services/cms/postsService.ts
var DEFAULT_COVER_IMAGE = "https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80";
var SUPABASE_POST_SELECT = "*, author:users!posts_author_id_fkey(display_name)";
function normalizeSupabasePostRow(raw) {
  const authorObj = Array.isArray(raw.author) ? raw.author[0] : raw.author;
  const authorName = authorObj && typeof authorObj === "object" && "display_name" in authorObj ? String(authorObj.display_name || "") || null : null;
  const { author: _ignored, ...rest } = raw;
  return {
    ...rest,
    id: Number(rest.id),
    author_id: rest.author_id !== null && rest.author_id !== void 0 ? Number(rest.author_id) : null,
    reviewed_by: rest.reviewed_by !== null && rest.reviewed_by !== void 0 ? Number(rest.reviewed_by) : null,
    author_name: authorName
  };
}
function validateSection(val) {
  return val === "stories" ? "stories" : "bento";
}
function validateTheme(val) {
  if (val === "culture" || val === "nature" || val === "cuisine") return val;
  return "coffee";
}
function sanitizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => String(item || "").trim()).filter(Boolean);
}
function sanitizeGlossary(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((g) => ({
    term: String(g?.term || "").trim(),
    def: String(g?.def || "").trim()
  })).filter((g) => g.term.length > 0 || g.def.length > 0);
}
function derivePreviewParagraphs(previewInput, contentHtml, excerpt) {
  const cleaned = sanitizeStringArray(previewInput);
  if (cleaned.length > 0) return cleaned;
  const extracted = Array.from(contentHtml.matchAll(/<p[^>]*>(.*?)<\/p>/gis)).map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 2);
  if (extracted.length > 0) return extracted;
  return excerpt ? [excerpt] : [];
}
function validateTranslationStatus(val) {
  if (val === "none" || val === "pending" || val === "translated" || val === "failed") {
    return val;
  }
  return null;
}
async function getPostRowWithAuthorById(id) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase getPostRowWithAuthorById failed: ${error.message}`);
    return data ? normalizeSupabasePostRow(data) : void 0;
  }
  const db = getDb();
  return db.prepare(
    `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.id = ?`
  ).get(id);
}
async function getRawPostById(id) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase getRawPostById failed: ${error.message}`);
    return data ? normalizeSupabasePostRow(data) : void 0;
  }
  const db = getDb();
  return db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
}
async function findPostRowWithAuthorBySlugOrLegacyKey(cleanedSlug) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: bySlug, error: slugErr } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("slug", cleanedSlug).limit(1).maybeSingle();
    if (slugErr) throw new Error(`Supabase post lookup by slug failed: ${slugErr.message}`);
    if (bySlug) return normalizeSupabasePostRow(bySlug);
    const { data: byLegacy, error: legacyErr } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("legacy_key", cleanedSlug).limit(1).maybeSingle();
    if (legacyErr) throw new Error(`Supabase post lookup by legacy_key failed: ${legacyErr.message}`);
    return byLegacy ? normalizeSupabasePostRow(byLegacy) : void 0;
  }
  const db = getDb();
  return db.prepare(
    `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.slug = ? OR p.legacy_key = ?
       LIMIT 1`
  ).get(cleanedSlug, cleanedSlug);
}
async function runTranslationAndSave(postId) {
  const row = await getRawPostById(postId);
  if (!row) return;
  const previewParagraphs = safeJsonValue(row.preview_paragraphs_json, []);
  const glossary = safeJsonValue(row.glossary_json, []);
  const { payload, status } = await translatePostToEnglish({
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    location: row.location,
    readTime: row.read_time,
    cta: row.cta_label,
    previewParagraphs,
    contentHtml: row.content_html,
    quote: row.quote,
    quoteSource: row.quote_source,
    glossary
  });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").update({
      title_en: payload.title,
      excerpt_en: payload.excerpt,
      category_en: payload.category,
      location_en: payload.location,
      read_time_en: payload.readTime,
      cta_label_en: payload.cta,
      preview_paragraphs_en_json: payload.previewParagraphs,
      content_html_en: payload.contentHtml,
      quote_en: payload.quote,
      quote_source_en: payload.quoteSource,
      glossary_en_json: payload.glossary,
      translation_status: status,
      translation_provider: payload.provider,
      translated_at: now
    }).eq("id", postId);
    if (error) throw new Error(`Supabase save translation failed: ${error.message}`);
    return;
  }
  const db = getDb();
  db.prepare(
    `UPDATE posts SET
      title_en = ?,
      excerpt_en = ?,
      category_en = ?,
      location_en = ?,
      read_time_en = ?,
      cta_label_en = ?,
      preview_paragraphs_en_json = ?,
      content_html_en = ?,
      quote_en = ?,
      quote_source_en = ?,
      glossary_en_json = ?,
      translation_status = ?,
      translation_provider = ?,
      translated_at = ?
     WHERE id = ?`
  ).run(
    payload.title,
    payload.excerpt,
    payload.category,
    payload.location,
    payload.readTime,
    payload.cta,
    JSON.stringify(payload.previewParagraphs),
    payload.contentHtml,
    payload.quote,
    payload.quoteSource,
    JSON.stringify(payload.glossary),
    status,
    payload.provider,
    now,
    postId
  );
}
async function listPublicPosts(lang, section) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("posts").select(SUPABASE_POST_SELECT).eq("status", "published");
    if (section === "bento" || section === "stories") {
      query = query.eq("section", section);
    }
    const { data, error } = await query.order("sort_order", { ascending: true }).order("published_at", { ascending: false }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase listPublicPosts failed: ${error.message}`);
    return (data || []).map(
      (r) => mapRowToPublicPost(normalizeSupabasePostRow(r), lang)
    );
  }
  const db = getDb();
  let sql = `
    SELECT p.*, u.display_name AS author_name
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE p.status = 'published'
  `;
  const params = [];
  if (section === "bento" || section === "stories") {
    sql += " AND p.section = ?";
    params.push(section);
  }
  sql += " ORDER BY p.sort_order ASC, p.published_at DESC, p.id ASC";
  const rows = db.prepare(sql).all(...params);
  return rows.map((row) => mapRowToPublicPost(row, lang));
}
async function queryRelevantPublishedPosts(params) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("status", "published").order("sort_order", { ascending: true }).order("published_at", { ascending: false }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase queryRelevantPublishedPosts failed: ${error.message}`);
    rows = (data || []).map(normalizeSupabasePostRow);
    rows.sort((a, b) => {
      const aStory = a.section === "stories" ? 1 : 0;
      const bStory = b.section === "stories" ? 1 : 0;
      if (bStory !== aStory) return bStory - aStory;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const aPub = a.published_at || "";
      const bPub = b.published_at || "";
      if (bPub !== aPub) return bPub.localeCompare(aPub);
      return a.id - b.id;
    });
  } else {
    const db = getDb();
    rows = db.prepare(
      `SELECT p.*, u.display_name AS author_name
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.status = 'published'
         ORDER BY (p.section = 'stories') DESC, p.sort_order ASC, p.published_at DESC, p.id ASC`
    ).all();
  }
  const posts = rows.map((row) => mapRowToPublicPost(row, params.lang));
  const limit = Math.max(1, Math.min(20, params.limit ?? 5));
  const cleanLocations = (params.locations || []).map((loc) => String(loc || "").trim().toLowerCase()).filter((loc) => loc.length >= 2);
  if (!params.themeKey && cleanLocations.length === 0) {
    return posts.slice(0, limit);
  }
  const scored = posts.map((post, idx) => {
    let score = post.section === "stories" ? 1 : 0;
    let matchedFilter = false;
    if (params.themeKey && post.themeKey === params.themeKey) {
      score += 10;
      matchedFilter = true;
    }
    const haystack = `${post.location} ${post.title} ${post.excerpt} ${post.category}`.toLowerCase();
    for (const loc of cleanLocations) {
      if (haystack.includes(loc)) {
        score += 5;
        matchedFilter = true;
      }
    }
    return { post, score, matchedFilter, idx };
  });
  const matching = scored.filter((item) => item.matchedFilter);
  const pool = matching.length > 0 ? matching : scored;
  pool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx;
  });
  return pool.slice(0, limit).map((item) => item.post);
}
async function getPublicPostBySlug(slug, lang, isPreview, authUser) {
  const cleanedSlug = String(slug || "").trim();
  const row = await findPostRowWithAuthorBySlugOrLegacyKey(cleanedSlug);
  if (!row) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (row.status !== "published") {
    const canPreview = isPreview && authUser && (authUser.role === "admin" || authUser.id === row.author_id);
    if (!canPreview) {
      throw new ServiceError(404, "NOT_PUBLISHED", "B\xE0i vi\u1EBFt ch\u01B0a \u0111\u01B0\u1EE3c xu\u1EA5t b\u1EA3n.");
    }
  }
  let relatedRows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("status", "published").neq("id", row.id).order("sort_order", { ascending: true });
    if (error) throw new Error(`Supabase related posts query failed: ${error.message}`);
    relatedRows = (data || []).map(normalizeSupabasePostRow);
    relatedRows.sort((a, b) => {
      const aSec = a.section === row.section ? 1 : 0;
      const bSec = b.section === row.section ? 1 : 0;
      if (bSec !== aSec) return bSec - aSec;
      const aTheme = a.theme_key === row.theme_key ? 1 : 0;
      const bTheme = b.theme_key === row.theme_key ? 1 : 0;
      if (bTheme !== aTheme) return bTheme - aTheme;
      return a.sort_order - b.sort_order;
    });
    relatedRows = relatedRows.slice(0, 3);
  } else {
    const db = getDb();
    relatedRows = db.prepare(
      `SELECT p.*, u.display_name AS author_name
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.status = 'published' AND p.id != ?
         ORDER BY (p.section = ?) DESC, (p.theme_key = ?) DESC, p.sort_order ASC
         LIMIT 3`
    ).all(row.id, row.section, row.theme_key);
  }
  return {
    post: mapRowToPublicPost(row, lang),
    related: relatedRows.map((r) => mapRowToPublicPost(r, lang))
  };
}
async function listAdminPosts(user, filters) {
  const section = filters?.section;
  const status = filters?.status;
  const slug = String(filters?.slug || "").trim();
  const q = String(filters?.q || "").trim().toLowerCase();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("posts").select(SUPABASE_POST_SELECT);
    if (user.role === "writer") {
      query = query.eq("author_id", user.id);
    }
    if (section === "bento" || section === "stories") {
      query = query.eq("section", section);
    }
    if (status === "draft" || status === "in_review" || status === "published") {
      query = query.eq("status", status);
    }
    const { data, error } = await query.order("section", { ascending: true }).order("sort_order", { ascending: true }).order("updated_at", { ascending: false });
    if (error) throw new Error(`Supabase listAdminPosts failed: ${error.message}`);
    let rows2 = (data || []).map(normalizeSupabasePostRow);
    if (slug) {
      rows2 = rows2.filter((r) => r.slug === slug || r.legacy_key === slug);
    }
    if (q) {
      rows2 = rows2.filter(
        (r) => r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)
      );
    }
    return rows2.map(mapRowToAdminPost);
  }
  const db = getDb();
  let sql = `
    SELECT p.*, u.display_name AS author_name
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE 1=1
  `;
  const params = [];
  if (user.role === "writer") {
    sql += " AND p.author_id = ?";
    params.push(user.id);
  }
  if (section === "bento" || section === "stories") {
    sql += " AND p.section = ?";
    params.push(section);
  }
  if (status === "draft" || status === "in_review" || status === "published") {
    sql += " AND p.status = ?";
    params.push(status);
  }
  if (slug) {
    sql += " AND (p.slug = ? OR p.legacy_key = ?)";
    params.push(slug, slug);
  }
  if (q) {
    sql += " AND (LOWER(p.title) LIKE ? OR LOWER(p.location) LIKE ? OR LOWER(p.category) LIKE ? OR LOWER(p.slug) LIKE ?)";
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern);
  }
  sql += " ORDER BY p.section ASC, p.sort_order ASC, p.updated_at DESC";
  const rows = db.prepare(sql).all(...params);
  return rows.map(mapRowToAdminPost);
}
async function getAdminPostById(user, id) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const row = await getPostRowWithAuthorById(id);
  if (!row) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer" && row.author_id !== user.id) {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 xem v\xE0 ch\u1EC9nh s\u1EEDa b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh."
    );
  }
  return mapRowToAdminPost(row);
}
async function getAdminPostByIdOrSlug(user, idOrSlug) {
  const raw = String(idOrSlug).trim();
  if (/^\d+$/.test(raw)) {
    return getAdminPostById(user, Number(raw));
  }
  const row = await findPostRowWithAuthorBySlugOrLegacyKey(raw);
  if (!row) {
    throw new ServiceError(404, "NOT_FOUND", `Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt "${raw}".`);
  }
  if (user.role === "writer" && row.author_id !== user.id) {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 xem v\xE0 ch\u1EC9nh s\u1EEDa b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh."
    );
  }
  return mapRowToAdminPost(row);
}
async function createAdminPost(user, body) {
  const title = String(body.title || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  if (!title || !excerpt) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "Ti\xEAu \u0111\u1EC1 v\xE0 m\xF4 t\u1EA3 ng\u1EAFn (excerpt) l\xE0 b\u1EAFt bu\u1ED9c."
    );
  }
  const section = validateSection(body.section);
  const themeKey = validateTheme(body.themeKey);
  const slug = await ensureUniqueSlug(String(body.slug || title));
  const contentHtml = sanitizeRichHtml(String(body.contentHtml || ""));
  const previewParagraphs = derivePreviewParagraphs(body.previewParagraphs, contentHtml, excerpt);
  const glossary = sanitizeGlossary(body.glossary);
  const sectionMeta = section === "bento" ? normalizeBentoMeta(body.bentoConfig) : normalizeStoryMeta(body.storyConfig);
  const requestedStatus = body.status;
  const finalStatus = user.role === "admin" && requestedStatus === "published" ? "published" : requestedStatus === "in_review" ? "in_review" : "draft";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const publishedAt = finalStatus === "published" ? now : null;
  const hasExplicitEn = user.role === "admin" && (Boolean(String(body.titleEn || "").trim()) || Boolean(String(body.contentHtmlEn || "").trim()));
  const enTitle = user.role === "admin" && body.titleEn !== void 0 ? String(body.titleEn) : "";
  const enExcerpt = user.role === "admin" && body.excerptEn !== void 0 ? String(body.excerptEn) : "";
  const enCategory = user.role === "admin" && body.categoryEn !== void 0 ? String(body.categoryEn) : "";
  const enLocation = user.role === "admin" && body.locationEn !== void 0 ? String(body.locationEn) : "";
  const enReadTime = user.role === "admin" && body.readTimeEn !== void 0 ? String(body.readTimeEn) : "";
  const enCta = user.role === "admin" && body.ctaEn !== void 0 ? String(body.ctaEn) : "";
  const enPreviewParagraphsArr = user.role === "admin" && body.previewParagraphsEn !== void 0 ? sanitizeStringArray(body.previewParagraphsEn) : [];
  const enContentHtml = user.role === "admin" && body.contentHtmlEn !== void 0 ? sanitizeRichHtml(String(body.contentHtmlEn)) : "";
  const enQuote = user.role === "admin" && body.quoteEn !== void 0 ? String(body.quoteEn) : "";
  const enQuoteSource = user.role === "admin" && body.quoteSourceEn !== void 0 ? String(body.quoteSourceEn) : "";
  const enGlossaryArr = user.role === "admin" && body.glossaryEn !== void 0 ? sanitizeGlossary(body.glossaryEn) : [];
  const explicitStatus = validateTranslationStatus(body.translationStatus);
  const translationStatus = hasExplicitEn ? explicitStatus || "translated" : "none";
  const translationProvider = hasExplicitEn ? String(body.translationProvider || "ai-agent").trim() : "";
  const translatedAt = hasExplicitEn ? now : null;
  let createdId;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: maxRow } = await supabase.from("posts").select("sort_order").eq("section", section).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const maxOrder = maxRow?.sort_order !== void 0 ? Number(maxRow.sort_order) : -1;
    const { data: inserted, error } = await supabase.from("posts").insert({
      slug,
      legacy_key: null,
      section,
      status: finalStatus,
      sort_order: maxOrder + 1,
      author_id: user.id,
      reviewed_by: finalStatus === "published" ? user.id : null,
      review_note: "",
      cover_image: String(body.image || "").trim() || DEFAULT_COVER_IMAGE,
      image_alt: String(body.imageAlt || title).trim(),
      theme_key: themeKey,
      section_meta_json: sectionMeta,
      title,
      excerpt,
      category: String(body.category || "Kh\xE1m ph\xE1 \u0110\u1EAFk L\u1EAFk").trim(),
      location: String(body.location || "\u0110\u1EAFk L\u1EAFk").trim(),
      read_time: String(body.readTime || "5 ph\xFAt \u0111\u1ECDc").trim(),
      cta_label: String(body.cta || "\u0110\u1ECDc c\xE2u chuy\u1EC7n").trim(),
      preview_paragraphs_json: previewParagraphs,
      content_html: contentHtml || `<p>${excerpt}</p>`,
      quote: String(body.quote || "").trim(),
      quote_source: String(body.quoteSource || "").trim(),
      glossary_json: glossary,
      title_en: enTitle,
      excerpt_en: enExcerpt,
      category_en: enCategory,
      location_en: enLocation,
      read_time_en: enReadTime,
      cta_label_en: enCta,
      preview_paragraphs_en_json: enPreviewParagraphsArr,
      content_html_en: enContentHtml,
      quote_en: enQuote,
      quote_source_en: enQuoteSource,
      glossary_en_json: enGlossaryArr,
      translation_status: translationStatus,
      translation_provider: translationProvider,
      translated_at: translatedAt,
      published_at: publishedAt,
      created_at: now,
      updated_at: now
    }).select("id").single();
    if (error || !inserted) {
      throw new Error(`Supabase createAdminPost failed: ${error?.message || "Unknown error"}`);
    }
    createdId = Number(inserted.id);
  } else {
    const db = getDb();
    const maxOrderRow = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM posts WHERE section = ?").get(section);
    const result = db.prepare(
      `INSERT INTO posts (
          slug, legacy_key, section, status, sort_order, author_id, reviewed_by, review_note,
          cover_image, image_alt, theme_key, section_meta_json,
          title, excerpt, category, location, read_time, cta_label,
          preview_paragraphs_json, content_html, quote, quote_source, glossary_json,
          title_en, excerpt_en, category_en, location_en, read_time_en, cta_label_en,
          preview_paragraphs_en_json, content_html_en, quote_en, quote_source_en, glossary_en_json,
          translation_status, translation_provider, translated_at,
          published_at, created_at, updated_at
        ) VALUES (
          ?, NULL, ?, ?, ?, ?, ?, '',
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?
        )`
    ).run(
      slug,
      section,
      finalStatus,
      maxOrderRow.maxOrder + 1,
      user.id,
      finalStatus === "published" ? user.id : null,
      String(body.image || "").trim() || DEFAULT_COVER_IMAGE,
      String(body.imageAlt || title).trim(),
      themeKey,
      JSON.stringify(sectionMeta),
      title,
      excerpt,
      String(body.category || "Kh\xE1m ph\xE1 \u0110\u1EAFk L\u1EAFk").trim(),
      String(body.location || "\u0110\u1EAFk L\u1EAFk").trim(),
      String(body.readTime || "5 ph\xFAt \u0111\u1ECDc").trim(),
      String(body.cta || "\u0110\u1ECDc c\xE2u chuy\u1EC7n").trim(),
      JSON.stringify(previewParagraphs),
      contentHtml || `<p>${excerpt}</p>`,
      String(body.quote || "").trim(),
      String(body.quoteSource || "").trim(),
      JSON.stringify(glossary),
      enTitle,
      enExcerpt,
      enCategory,
      enLocation,
      enReadTime,
      enCta,
      JSON.stringify(enPreviewParagraphsArr),
      enContentHtml,
      enQuote,
      enQuoteSource,
      JSON.stringify(enGlossaryArr),
      translationStatus,
      translationProvider,
      translatedAt,
      publishedAt,
      now,
      now
    );
    createdId = Number(result.lastInsertRowid);
  }
  if (finalStatus === "published" && (!hasExplicitEn || Boolean(body.retranslateOnSave))) {
    await runTranslationAndSave(createdId);
  }
  const createdRow = await getPostRowWithAuthorById(createdId);
  return mapRowToAdminPost(createdRow);
}
async function updateAdminPost(user, id, body) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer") {
    if (existing.author_id !== user.id) {
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 ch\u1EC9nh s\u1EEDa b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh."
      );
    }
    if (existing.status === "published") {
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "B\xE0i vi\u1EBFt \u0111\xE3 xu\u1EA5t b\u1EA3n ch\u1EC9 c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c ch\u1EC9nh s\u1EEDa b\u1EDFi Qu\u1EA3n tr\u1ECB vi\xEAn (Admin)."
      );
    }
  }
  const title = String(body.title ?? existing.title).trim();
  const excerpt = String(body.excerpt ?? existing.excerpt).trim();
  if (!title || !excerpt) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "Ti\xEAu \u0111\u1EC1 v\xE0 m\xF4 t\u1EA3 ng\u1EAFn (excerpt) kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng."
    );
  }
  const section = body.section ? validateSection(body.section) : existing.section;
  const themeKey = body.themeKey ? validateTheme(body.themeKey) : existing.theme_key;
  const slug = body.slug ? await ensureUniqueSlug(String(body.slug), id) : existing.slug;
  const contentHtml = body.contentHtml !== void 0 ? sanitizeRichHtml(String(body.contentHtml)) : existing.content_html;
  const previewParagraphs = body.previewParagraphs !== void 0 ? derivePreviewParagraphs(body.previewParagraphs, contentHtml, excerpt) : safeJsonValue(existing.preview_paragraphs_json, []);
  const glossary = body.glossary !== void 0 ? sanitizeGlossary(body.glossary) : safeJsonValue(existing.glossary_json, []);
  const sectionMeta = section === "bento" ? normalizeBentoMeta(
    body.bentoConfig ?? safeJsonValue(existing.section_meta_json, {})
  ) : normalizeStoryMeta(
    body.storyConfig ?? safeJsonValue(existing.section_meta_json, {})
  );
  let nextStatus = existing.status;
  if (user.role === "writer") {
    if (body.status === "draft" || body.status === "in_review") {
      nextStatus = body.status;
    }
  } else if (body.status === "draft" || body.status === "in_review" || body.status === "published") {
    nextStatus = body.status;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const publishedAt = nextStatus === "published" ? existing.published_at || now : existing.published_at;
  const isAdmin = user.role === "admin";
  const enTitle = isAdmin && body.titleEn !== void 0 ? String(body.titleEn) : existing.title_en;
  const enExcerpt = isAdmin && body.excerptEn !== void 0 ? String(body.excerptEn) : existing.excerpt_en;
  const enCategory = isAdmin && body.categoryEn !== void 0 ? String(body.categoryEn) : existing.category_en;
  const enLocation = isAdmin && body.locationEn !== void 0 ? String(body.locationEn) : existing.location_en;
  const enReadTime = isAdmin && body.readTimeEn !== void 0 ? String(body.readTimeEn) : existing.read_time_en;
  const enCta = isAdmin && body.ctaEn !== void 0 ? String(body.ctaEn) : existing.cta_label_en;
  const enPreviewParagraphsArr = isAdmin && body.previewParagraphsEn !== void 0 ? sanitizeStringArray(body.previewParagraphsEn) : safeJsonValue(existing.preview_paragraphs_en_json, []);
  const enContentHtml = isAdmin && body.contentHtmlEn !== void 0 ? sanitizeRichHtml(String(body.contentHtmlEn)) : existing.content_html_en;
  const enQuote = isAdmin && body.quoteEn !== void 0 ? String(body.quoteEn) : existing.quote_en;
  const enQuoteSource = isAdmin && body.quoteSourceEn !== void 0 ? String(body.quoteSourceEn) : existing.quote_source_en;
  const enGlossaryArr = isAdmin && body.glossaryEn !== void 0 ? sanitizeGlossary(body.glossaryEn) : safeJsonValue(existing.glossary_en_json, []);
  const enFieldsSubmitted = isAdmin && [
    "titleEn",
    "excerptEn",
    "categoryEn",
    "locationEn",
    "readTimeEn",
    "ctaEn",
    "previewParagraphsEn",
    "contentHtmlEn",
    "quoteEn",
    "quoteSourceEn",
    "glossaryEn"
  ].some((k) => body[k] !== void 0);
  const explicitTranslationStatus = isAdmin ? validateTranslationStatus(body.translationStatus) : null;
  const nextTranslationStatus = explicitTranslationStatus ?? (enFieldsSubmitted && (enTitle.trim() || enContentHtml.trim()) ? "translated" : existing.translation_status);
  const nextTranslationProvider = isAdmin && body.translationProvider !== void 0 ? String(body.translationProvider).trim() : existing.translation_provider;
  const nextTranslatedAt = enFieldsSubmitted && (enTitle.trim() || enContentHtml.trim()) ? now : existing.translated_at;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").update({
      slug,
      section,
      status: nextStatus,
      cover_image: String(body.image ?? existing.cover_image).trim(),
      image_alt: String(body.imageAlt ?? existing.image_alt).trim(),
      theme_key: themeKey,
      section_meta_json: sectionMeta,
      title,
      excerpt,
      category: String(body.category ?? existing.category).trim(),
      location: String(body.location ?? existing.location).trim(),
      read_time: String(body.readTime ?? existing.read_time).trim(),
      cta_label: String(body.cta ?? existing.cta_label).trim(),
      preview_paragraphs_json: previewParagraphs,
      content_html: contentHtml,
      quote: String(body.quote ?? existing.quote).trim(),
      quote_source: String(body.quoteSource ?? existing.quote_source).trim(),
      glossary_json: glossary,
      title_en: enTitle,
      excerpt_en: enExcerpt,
      category_en: enCategory,
      location_en: enLocation,
      read_time_en: enReadTime,
      cta_label_en: enCta,
      preview_paragraphs_en_json: enPreviewParagraphsArr,
      content_html_en: enContentHtml,
      quote_en: enQuote,
      quote_source_en: enQuoteSource,
      glossary_en_json: enGlossaryArr,
      translation_status: nextTranslationStatus,
      translation_provider: nextTranslationProvider,
      translated_at: nextTranslatedAt,
      published_at: publishedAt,
      updated_at: now
    }).eq("id", id);
    if (error) throw new Error(`Supabase updateAdminPost failed: ${error.message}`);
  } else {
    const db = getDb();
    db.prepare(
      `UPDATE posts SET
        slug = ?, section = ?, status = ?, cover_image = ?, image_alt = ?, theme_key = ?, section_meta_json = ?,
        title = ?, excerpt = ?, category = ?, location = ?, read_time = ?, cta_label = ?,
        preview_paragraphs_json = ?, content_html = ?, quote = ?, quote_source = ?, glossary_json = ?,
        title_en = ?, excerpt_en = ?, category_en = ?, location_en = ?, read_time_en = ?, cta_label_en = ?,
        preview_paragraphs_en_json = ?, content_html_en = ?, quote_en = ?, quote_source_en = ?, glossary_en_json = ?,
        translation_status = ?, translation_provider = ?, translated_at = ?,
        published_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      slug,
      section,
      nextStatus,
      String(body.image ?? existing.cover_image).trim(),
      String(body.imageAlt ?? existing.image_alt).trim(),
      themeKey,
      JSON.stringify(sectionMeta),
      title,
      excerpt,
      String(body.category ?? existing.category).trim(),
      String(body.location ?? existing.location).trim(),
      String(body.readTime ?? existing.read_time).trim(),
      String(body.cta ?? existing.cta_label).trim(),
      JSON.stringify(previewParagraphs),
      contentHtml,
      String(body.quote ?? existing.quote).trim(),
      String(body.quoteSource ?? existing.quote_source).trim(),
      JSON.stringify(glossary),
      enTitle,
      enExcerpt,
      enCategory,
      enLocation,
      enReadTime,
      enCta,
      JSON.stringify(enPreviewParagraphsArr),
      enContentHtml,
      enQuote,
      enQuoteSource,
      JSON.stringify(enGlossaryArr),
      nextTranslationStatus,
      nextTranslationProvider,
      nextTranslatedAt,
      publishedAt,
      now,
      id
    );
  }
  const hasCustomEnTranslation = Boolean(enTitle.trim() && enContentHtml.trim());
  const shouldAutoTranslate = Boolean(body.retranslateOnSave) || nextStatus === "published" && existing.status !== "published" && !hasCustomEnTranslation;
  if (shouldAutoTranslate) {
    await runTranslationAndSave(id);
  }
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function submitAdminPost(user, id) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer" && existing.author_id !== user.id) {
    throw new ServiceError(403, "FORBIDDEN", "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 g\u1EEDi duy\u1EC7t b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").update({ status: "in_review", review_note: "", updated_at: now }).eq("id", id);
    if (error) throw new Error(`Supabase submitAdminPost failed: ${error.message}`);
  } else {
    const db = getDb();
    db.prepare(
      "UPDATE posts SET status = 'in_review', review_note = '', updated_at = ? WHERE id = ?"
    ).run(now, id);
  }
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function reviewAdminPost(admin, id, action, reviewNote = "") {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  if (!["publish", "return_draft", "unpublish"].includes(action)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "H\xE0nh \u0111\u1ED9ng duy\u1EC7t kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cleanedNote = reviewNote.trim();
  if (action === "publish") {
    if (isUsingSupabase()) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("posts").update({
        status: "published",
        reviewed_by: admin.id,
        review_note: "",
        published_at: existing.published_at || now,
        updated_at: now
      }).eq("id", id);
      if (error) throw new Error(`Supabase reviewAdminPost publish failed: ${error.message}`);
    } else {
      const db = getDb();
      db.prepare(
        `UPDATE posts
         SET status = 'published', reviewed_by = ?, review_note = '', published_at = COALESCE(published_at, ?), updated_at = ?
         WHERE id = ?`
      ).run(admin.id, now, now, id);
    }
    const alreadyTranslatedByAgent = existing.translation_status === "translated" && Boolean(existing.title_en.trim()) && Boolean(existing.content_html_en.trim()) && existing.translation_provider !== "local-fallback";
    if (!alreadyTranslatedByAgent) {
      await runTranslationAndSave(id);
    }
  } else {
    if (isUsingSupabase()) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("posts").update({
        status: "draft",
        reviewed_by: admin.id,
        review_note: cleanedNote,
        updated_at: now
      }).eq("id", id);
      if (error) throw new Error(`Supabase reviewAdminPost return failed: ${error.message}`);
    } else {
      const db = getDb();
      db.prepare(
        `UPDATE posts
         SET status = 'draft', reviewed_by = ?, review_note = ?, updated_at = ?
         WHERE id = ?`
      ).run(admin.id, cleanedNote, now, id);
    }
  }
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function retranslateAdminPost(admin, id) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  await runTranslationAndSave(id);
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function saveCustomTranslation(user, id, body) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer") {
    if (existing.author_id !== user.id) {
      throw new ServiceError(403, "FORBIDDEN", "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 d\u1ECBch b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh.");
    }
    if (existing.status === "published") {
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "B\xE0i vi\u1EBFt \u0111\xE3 xu\u1EA5t b\u1EA3n ch\u1EC9 c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt b\u1EA3n d\u1ECBch b\u1EDFi Qu\u1EA3n tr\u1ECB vi\xEAn (Admin)."
      );
    }
  }
  const titleEn = String(body.titleEn ?? body.title ?? existing.title_en).trim();
  const excerptEn = String(body.excerptEn ?? body.excerpt ?? existing.excerpt_en).trim();
  const categoryEn = String(body.categoryEn ?? body.category ?? existing.category_en).trim();
  const locationEn = String(body.locationEn ?? body.location ?? existing.location_en).trim();
  const readTimeEn = String(body.readTimeEn ?? body.readTime ?? existing.read_time_en).trim();
  const ctaEn = String(body.ctaEn ?? body.cta ?? existing.cta_label_en).trim();
  const rawHtml = body.contentHtmlEn ?? body.contentHtml;
  const contentHtmlEn = rawHtml !== void 0 ? sanitizeRichHtml(String(rawHtml)) : existing.content_html_en;
  const rawPreview = body.previewParagraphsEn ?? body.previewParagraphs;
  const previewParagraphsEn = rawPreview !== void 0 ? derivePreviewParagraphs(rawPreview, contentHtmlEn, excerptEn) : safeJsonValue(existing.preview_paragraphs_en_json, []);
  const quoteEn = String(body.quoteEn ?? body.quote ?? existing.quote_en).trim();
  const quoteSourceEn = String(
    body.quoteSourceEn ?? body.quoteSource ?? existing.quote_source_en
  ).trim();
  const rawGlossary = body.glossaryEn ?? body.glossary;
  const glossaryEn = rawGlossary !== void 0 ? sanitizeGlossary(rawGlossary) : safeJsonValue(existing.glossary_en_json, []);
  if (!titleEn || !excerptEn) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "B\u1EA3n d\u1ECBch ti\u1EBFng Anh c\u1EA7n c\xF3 t\u1ED1i thi\u1EC3u titleEn v\xE0 excerptEn."
    );
  }
  const provider = String(body.provider || body.translationProvider || "ai-agent").trim();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").update({
      title_en: titleEn,
      excerpt_en: excerptEn,
      category_en: categoryEn,
      location_en: locationEn,
      read_time_en: readTimeEn,
      cta_label_en: ctaEn,
      preview_paragraphs_en_json: previewParagraphsEn,
      content_html_en: contentHtmlEn,
      quote_en: quoteEn,
      quote_source_en: quoteSourceEn,
      glossary_en_json: glossaryEn,
      translation_status: "translated",
      translation_provider: provider,
      translated_at: now,
      updated_at: now
    }).eq("id", id);
    if (error) throw new Error(`Supabase saveCustomTranslation failed: ${error.message}`);
  } else {
    const db = getDb();
    db.prepare(
      `UPDATE posts SET
        title_en = ?, excerpt_en = ?, category_en = ?, location_en = ?, read_time_en = ?, cta_label_en = ?,
        preview_paragraphs_en_json = ?, content_html_en = ?, quote_en = ?, quote_source_en = ?, glossary_en_json = ?,
        translation_status = 'translated', translation_provider = ?, translated_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      titleEn,
      excerptEn,
      categoryEn,
      locationEn,
      readTimeEn,
      ctaEn,
      JSON.stringify(previewParagraphsEn),
      contentHtmlEn,
      quoteEn,
      quoteSourceEn,
      JSON.stringify(glossaryEn),
      provider,
      now,
      now,
      id
    );
  }
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function reorderAdminPosts(admin, sectionInput, orderedIdsInput) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  const section = validateSection(sectionInput);
  const orderedIds = Array.isArray(orderedIdsInput) ? orderedIdsInput.map((x) => Number(x)).filter((n) => Number.isInteger(n)) : [];
  if (orderedIds.length === 0) {
    throw new ServiceError(400, "VALIDATION_ERROR", "Danh s\xE1ch ID s\u1EAFp x\u1EBFp kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    await Promise.all(
      orderedIds.map(async (postId, idx) => {
        const { error } = await supabase.from("posts").update({ sort_order: idx }).eq("id", postId).eq("section", section);
        if (error) throw new Error(`Supabase reorderAdminPosts failed: ${error.message}`);
      })
    );
    return;
  }
  const db = getDb();
  const stmt = db.prepare("UPDATE posts SET sort_order = ? WHERE id = ? AND section = ?");
  db.exec("BEGIN");
  try {
    orderedIds.forEach((postId, idx) => {
      stmt.run(idx, postId, section);
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
async function deleteAdminPost(user, id) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer") {
    if (existing.author_id !== user.id) {
      throw new ServiceError(403, "FORBIDDEN", "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 x\xF3a b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh.");
    }
    if (existing.status !== "draft") {
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "T\xE1c gi\u1EA3 ch\u1EC9 c\xF3 th\u1EC3 x\xF3a b\xE0i vi\u1EBFt \u1EDF tr\u1EA1ng th\xE1i B\u1EA3n nh\xE1p."
      );
    }
  }
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw new Error(`Supabase deleteAdminPost failed: ${error.message}`);
    return;
  }
  const db = getDb();
  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
}
async function getCmsStatsAndContext(sectionFilter) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("posts").select("id, slug, section, status, theme_key, title, category, location, translation_status");
    if (sectionFilter === "bento" || sectionFilter === "stories") {
      query = query.eq("section", sectionFilter);
    }
    const { data, error } = await query.order("section", { ascending: true }).order("sort_order", { ascending: true }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase getCmsStatsAndContext failed: ${error.message}`);
    rows = (data || []).map((r) => ({ ...r, id: Number(r.id) }));
  } else {
    const db = getDb();
    let sql = "SELECT id, slug, section, status, theme_key, title, category, location, translation_status FROM posts";
    const params = [];
    if (sectionFilter === "bento" || sectionFilter === "stories") {
      sql += " WHERE section = ?";
      params.push(sectionFilter);
    }
    sql += " ORDER BY section ASC, sort_order ASC, id ASC";
    rows = db.prepare(sql).all(...params);
  }
  const byStatus = { draft: 0, in_review: 0, published: 0 };
  const bySection = { bento: 0, stories: 0 };
  const catSet = /* @__PURE__ */ new Set();
  const locSet = /* @__PURE__ */ new Set();
  for (const r of rows) {
    if (r.status in byStatus) byStatus[r.status] += 1;
    if (r.section in bySection) bySection[r.section] += 1;
    if (r.category) catSet.add(r.category);
    if (r.location) locSet.add(r.location);
  }
  return {
    counts: {
      total: rows.length,
      byStatus,
      bySection
    },
    categories: Array.from(catSet),
    locations: Array.from(locSet),
    existingPosts: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      section: r.section,
      status: r.status,
      themeKey: r.theme_key,
      title: r.title,
      category: r.category,
      location: r.location,
      translationStatus: r.translation_status
    }))
  };
}

// server/routes/adminPostsRoutes.ts
var adminPostsRouter = Router();
adminPostsRouter.use(requireAuth);
function handleRouteError(res, next, err) {
  if (isServiceError(err)) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  next(err);
}
adminPostsRouter.get("/context", async (req, res, next) => {
  try {
    const section = typeof req.query.section === "string" ? req.query.section : void 0;
    res.json(await getCmsStatsAndContext(section));
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.get("/", async (req, res, next) => {
  try {
    const posts = await listAdminPosts(req.authUser, {
      section: typeof req.query.section === "string" ? req.query.section : void 0,
      status: typeof req.query.status === "string" ? req.query.status : void 0,
      slug: typeof req.query.slug === "string" ? req.query.slug : void 0,
      q: typeof req.query.q === "string" ? req.query.q : void 0
    });
    res.json({ posts });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.get("/:id", async (req, res, next) => {
  try {
    const post = await getAdminPostByIdOrSlug(req.authUser, String(req.params.id));
    res.json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.post("/", async (req, res, next) => {
  try {
    const post = await createAdminPost(req.authUser, req.body || {});
    res.status(201).json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.put("/:id", async (req, res, next) => {
  try {
    const post = await updateAdminPost(
      req.authUser,
      Number(req.params.id),
      req.body || {}
    );
    res.json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const post = await submitAdminPost(req.authUser, Number(req.params.id));
    res.json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.post(
  "/:id/review",
  requireAdmin,
  async (req, res, next) => {
    try {
      const post = await reviewAdminPost(
        req.authUser,
        Number(req.params.id),
        String(req.body?.action || ""),
        String(req.body?.reviewNote || "")
      );
      res.json({ post });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);
adminPostsRouter.post(
  "/:id/retranslate",
  requireAdmin,
  async (req, res, next) => {
    try {
      const post = await retranslateAdminPost(req.authUser, Number(req.params.id));
      res.json({ post });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);
adminPostsRouter.post(
  "/:id/translation",
  async (req, res, next) => {
    try {
      const post = await saveCustomTranslation(
        req.authUser,
        Number(req.params.id),
        req.body || {}
      );
      res.json({ post });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);
adminPostsRouter.patch(
  "/reorder",
  requireAdmin,
  async (req, res, next) => {
    try {
      await reorderAdminPosts(req.authUser, req.body?.section, req.body?.orderedIds);
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);
adminPostsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteAdminPost(req.authUser, Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});

// server/routes/adminUsersRoutes.ts
import { Router as Router2 } from "express";

// server/services/cms/usersService.ts
function isActiveFlag(val) {
  return val === true || val === 1;
}
function mapUserRow(u) {
  return {
    id: Number(u.id),
    email: u.email,
    displayName: u.display_name,
    role: u.role,
    isActive: isActiveFlag(u.is_active),
    createdAt: u.created_at
  };
}
async function findUserForLoginByEmail(email) {
  const cleaned = email.trim().toLowerCase();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("users").select("id, email, display_name, password_hash, role, is_active, created_at").eq("email", cleaned).maybeSingle();
    if (error) {
      throw new Error(`Supabase login query failed: ${error.message}`);
    }
    return data ?? null;
  }
  const db = getDb();
  const row = db.prepare(
    "SELECT id, email, display_name, password_hash, role, is_active, created_at FROM users WHERE email = ?"
  ).get(cleaned);
  return row ?? null;
}
async function listUsers(admin) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("users").select("id, email, display_name, role, is_active, created_at").order("id", { ascending: true });
    if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);
    return (data || []).map(mapUserRow);
  }
  const db = getDb();
  const rows = db.prepare("SELECT id, email, display_name, role, is_active, created_at FROM users ORDER BY id ASC").all();
  return rows.map(mapUserRow);
}
async function createUser(admin, body) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  const email = String(body.email || "").trim().toLowerCase();
  const displayName = String(body.displayName || "").trim();
  const password = String(body.password || "");
  const role = body.role === "admin" ? "admin" : "writer";
  if (!email || !displayName || password.length < 6) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "Email, t\xEAn hi\u1EC3n th\u1ECB v\xE0 m\u1EADt kh\u1EA9u (t\u1ED1i thi\u1EC3u 6 k\xFD t\u1EF1) l\xE0 b\u1EAFt bu\u1ED9c."
    );
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: dup2 } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (dup2) {
      throw new ServiceError(409, "CONFLICT", "Email n\xE0y \u0111\xE3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng.");
    }
    const { data, error } = await supabase.from("users").insert({
      email,
      display_name: displayName,
      password_hash: hashPassword(password),
      role,
      is_active: true,
      created_at: now
    }).select("id, email, display_name, role, is_active, created_at").single();
    if (error || !data) {
      throw new Error(`Supabase createUser failed: ${error?.message || "Unknown error"}`);
    }
    return mapUserRow(data);
  }
  const db = getDb();
  const dup = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (dup) {
    throw new ServiceError(409, "CONFLICT", "Email n\xE0y \u0111\xE3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng.");
  }
  const result = db.prepare(
    `INSERT INTO users (email, display_name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`
  ).run(email, displayName, hashPassword(password), role, now);
  return {
    id: Number(result.lastInsertRowid),
    email,
    displayName,
    role,
    isActive: true,
    createdAt: now
  };
}
async function updateUser(admin, id, body) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID t\xE0i kho\u1EA3n kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: existing2, error: fetchErr } = await supabase.from("users").select("id, email, display_name, role, is_active, created_at").eq("id", id).maybeSingle();
    if (fetchErr) throw new Error(`Supabase updateUser fetch failed: ${fetchErr.message}`);
    if (!existing2) {
      throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.");
    }
    if (admin.id === id && body.isActive === false) {
      throw new ServiceError(
        400,
        "VALIDATION_ERROR",
        "Kh\xF4ng th\u1EC3 t\u1EF1 kh\xF3a t\xE0i kho\u1EA3n \u0111ang \u0111\u0103ng nh\u1EADp."
      );
    }
    const existingRow = existing2;
    const nextActive2 = typeof body.isActive === "boolean" ? body.isActive : isActiveFlag(existingRow.is_active);
    const nextRole2 = body.role === "admin" || body.role === "writer" ? body.role : existingRow.role;
    const { data: updated, error: updateErr } = await supabase.from("users").update({ is_active: nextActive2, role: nextRole2 }).eq("id", id).select("id, email, display_name, role, is_active, created_at").single();
    if (updateErr || !updated) {
      throw new Error(`Supabase updateUser failed: ${updateErr?.message || "Unknown error"}`);
    }
    return mapUserRow(updated);
  }
  const db = getDb();
  const existing = db.prepare("SELECT id, email, display_name, role, is_active, created_at FROM users WHERE id = ?").get(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.");
  }
  if (admin.id === id && body.isActive === false) {
    throw new ServiceError(400, "VALIDATION_ERROR", "Kh\xF4ng th\u1EC3 t\u1EF1 kh\xF3a t\xE0i kho\u1EA3n \u0111ang \u0111\u0103ng nh\u1EADp.");
  }
  const nextActive = typeof body.isActive === "boolean" ? body.isActive ? 1 : 0 : isActiveFlag(existing.is_active) ? 1 : 0;
  const nextRole = body.role === "admin" || body.role === "writer" ? body.role : existing.role;
  db.prepare("UPDATE users SET is_active = ?, role = ? WHERE id = ?").run(nextActive, nextRole, id);
  return {
    id: existing.id,
    email: existing.email,
    displayName: existing.display_name,
    role: nextRole,
    isActive: nextActive === 1,
    createdAt: existing.created_at
  };
}

// server/routes/adminUsersRoutes.ts
var adminUsersRouter = Router2();
adminUsersRouter.use(requireAuth, requireAdmin);
adminUsersRouter.get("/", async (req, res, next) => {
  try {
    res.json({ users: await listUsers(req.authUser) });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});
adminUsersRouter.post("/", async (req, res, next) => {
  try {
    const user = await createUser(req.authUser, req.body || {});
    res.status(201).json({ user });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});
adminUsersRouter.patch("/:id", async (req, res, next) => {
  try {
    const user = await updateUser(req.authUser, Number(req.params.id), req.body || {});
    res.json({ user });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});

// server/routes/aiRoutes.ts
import { Router as Router3 } from "express";

// server/services/ai/aiChatbot.ts
import crypto3 from "node:crypto";
import { OpenInferenceSpanKind as OpenInferenceSpanKind9 } from "@arizeai/openinference-semantic-conventions";

// src/data/plannerCatalog.ts
var companionLabels = {
  solo: "\u0110\u1ED9c h\xE0nh",
  couple: "C\u1EB7p \u0111\xF4i",
  family: "Gia \u0111\xECnh",
  friends: "Nh\xF3m b\u1EA1n"
};
var themeLabels = {
  culture: "V\u0103n h\xF3a & C\u1ED3ng chi\xEAng",
  coffee: "C\xE0 ph\xEA & Ngh\u1EC9 d\u01B0\u1EE1ng",
  nature: "Thi\xEAn nhi\xEAn & Th\xE1c n\u01B0\u1EDBc",
  cuisine: "\u1EA8m th\u1EF1c b\u1EA3n \u0111\u1ECBa"
};
var budgetMultipliers = {
  budget: {
    label: "Ti\u1EBFt ki\u1EC7m",
    perDay: 115e4,
    stayMove: "Homestay Nh\xE0 D\xE0i \xCA \u0110\xEA \u2022 Xe m\xE1y / Xe bu\xFDt tuy\u1EBFn \u0111i\u1EC3m"
  },
  standard: {
    label: "Ti\xEAu chu\u1EA9n",
    perDay: 175e4,
    stayMove: "Boutique Hotel 4\u2605 BMT + Bungalow ven h\u1ED3 \u2022 \xD4 t\xF4 t\u1EF1 l\xE1i"
  },
  luxury: {
    label: "Cao c\u1EA5p",
    perDay: 31e5,
    stayMove: "Eco-Resort cao c\u1EA5p H\u1ED3 L\u1EAFk \u2022 Xe ri\xEAng & H\u01B0\u1EDBng d\u1EABn vi\xEAn b\u1EA3n \u0111\u1ECBa"
  }
};
var plannerCatalog = {
  coffee: {
    relatedArticleKey: "coffee",
    title: "H\xE0nh Tr\xECnh S\u1EDBm Mai Gi\u1EEFa V\u01B0\u1EDDn Robusta & S\u01B0\u01A1ng M\u1EDD H\u1ED3 L\u1EAFk",
    hiddenGem: "N\xF4ng tr\u1EA1i Fine Robusta Ea T\xE2n & B\u1EBFn thuy\u1EC1n \u0111\u1ED9c m\u1ED9c Bu\xF4n L\xEA l\xFAc 5h45 s\xE1ng.",
    routeTip: "Tuy\u1EBFn kh\xE9p k\xEDn: S\xE2n bay BMV \u2192 Trung t\xE2m BMT \u2192 C\u01B0 M\u2019gar \u2192 QL27 \u0111i H\u1ED3 L\u1EAFk (138km), kh\xF4ng quay \u0111\u1EA7u.",
    totalKmBase: 138,
    days: [
      {
        day: "Ng\xE0y 1",
        title: "Ch\u1EA1m ng\xF5 Th\u1EE7 ph\u1EE7 C\xE0 ph\xEA & Bu\xF4n c\u1ED5 Ako Dh\xF4ng",
        area: "TP. Bu\xF4n Ma Thu\u1ED9t \u2022 ~24 km",
        slots: [
          {
            time: "08:00 \u2013 09:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Th\u01B0\u1EDFng th\u1EE9c C\xE0 ph\xEA Rang M\u1ED9c & \u0110i\u1EC3m t\xE2m Ph\u1ED1 n\xFAi",
            location: "Ph\u1ED1 Phan \u0110\xECnh Gi\xF3t \u2022 BMT",
            x: 375,
            y: 192,
            desc: "Kh\u1EDFi \u0111\u1EA7u b\u1EB1ng ly espresso Fine Robusta chi\u1EBFt xu\u1EA5t th\u1EE7 c\xF4ng d\u01B0\u1EDBi t\xE1n c\xE2y c\u1ED5 th\u1EE5 v\xE0 b\xFAn ch\xECa Ban M\xEA."
          },
          {
            time: "09:45 \u2013 12:00",
            period: "Gi\u1EEFa s\xE1ng",
            title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA",
            location: "\u0110\u01B0\u1EDDng Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u \u2022 BMT",
            x: 405,
            y: 172,
            desc: "Chi\xEAm ng\u01B0\u1EE1ng ki\u1EBFn tr\xFAc m\xE1i v\xF2m nh\xE0 d\xE0i \xCA \u0110\xEA \u0111\u01B0\u01A1ng \u0111\u1EA1i v\xE0 h\u01A1n 10.000 hi\u1EC7n v\u1EADt v\u0103n minh c\xE0 ph\xEA to\xE0n c\u1EA7u."
          },
          {
            time: "14:30 \u2013 17:15",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "D\u1EA1o b\u01B0\u1EDBc Bu\xF4n c\u1ED5 Ako Dh\xF4ng",
            location: "Cu\u1ED1i \u0111\u01B0\u1EDDng Tr\u1EA7n Nh\u1EADt Du\u1EADt \u2022 BMT",
            x: 392,
            y: 150,
            desc: "Th\u0103m nh\u1EEFng n\u1EBFp nh\xE0 d\xE0i m\u1EABu h\u1EC7 nguy\xEAn b\u1EA3n gi\u1EEFa r\u1EEBng c\xE2y \u0111\u1EA7u ngu\u1ED3n v\xE0 tr\xF2 chuy\u1EC7n c\xF9ng gi\xE0 l\xE0ng."
          },
          {
            time: "19:00 \u2013 21:00",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "Tr\u1EA3i nghi\u1EC7m C\xE0 ph\xEA V\u1EE3t \u0110\xEAm & \u1EA8m th\u1EF1c Bazan",
            location: "Trung t\xE2m Bu\xF4n Ma Thu\u1ED9t",
            x: 368,
            y: 205,
            desc: "Th\u01B0\u1EDFng th\u1EE9c g\xE0 n\u01B0\u1EDBng c\u01A1m lam v\xE0 nh\xE2m nhi t\xE1ch c\xE0 ph\xEA v\u1EE3t n\xF3ng h\u1ED5i trong ti\u1EBFt tr\u1EDDi se l\u1EA1nh ph\u1ED1 n\xFAi."
          }
        ]
      },
      {
        day: "Ng\xE0y 2",
        title: "T\u1EEB R\u1EABy Fine Robusta C\u01B0 M\u2019gar \u0111\u1EBFn Ho\xE0ng h\xF4n H\u1ED3 L\u1EAFk",
        area: "C\u01B0 M\u2019gar \u2192 QL27 \u2192 H\u1ED3 L\u1EAFk \u2022 ~72 km",
        slots: [
          {
            time: "07:30 \u2013 11:00",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Workshop Thu h\xE1i & S\u01A1 ch\u1EBF C\xE0 ph\xEA Honey",
            location: "N\xF4ng tr\u1EA1i C\u01B0 M\u2019gar / Ea T\xE2n",
            x: 472,
            y: 92,
            desc: "Tr\u1EF1c ti\u1EBFp tr\u1EA3i nghi\u1EC7m quy tr\xECnh h\xE1i ch\xEDn 100%, ph\u01A1i gi\xE0n nh\xE0 k\xEDnh v\xE0 th\u1EED n\u1EBFm (cupping) c\xE1c m\u1EBB rang m\u1EDBi."
          },
          {
            time: "12:00 \u2013 13:45",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "D\u1EEBng ch\xE2n \u0110\xE1 Voi M\u1EB9 Yang Tao",
            location: "X\xE3 Yang Tao \u2022 Qu\u1ED1c l\u1ED9 27",
            x: 478,
            y: 256,
            desc: "Ng\u1EAFm to\xE0n c\u1EA3nh thung l\u0169ng l\xFAa d\u01B0\u1EDBi ch\xE2n d\xE3y Ch\u01B0 Yang Sin t\u1EEB t\u1EA3ng \u0111\xE1 nguy\xEAn kh\u1ED1i l\u1EDBn nh\u1EA5t Vi\u1EC7t Nam."
          },
          {
            time: "15:30 \u2013 18:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Ng\u1EAFm Ho\xE0ng h\xF4n tr\xEAn M\u1EB7t g\u01B0\u01A1ng H\u1ED3 L\u1EAFk",
            location: "Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n \u2022 Huy\u1EC7n L\u1EAFk",
            x: 545,
            y: 315,
            desc: "Nh\u1EADn ph\xF2ng bungalow ven h\u1ED3, th\u1EA3 b\u01B0\u1EDBc d\u1ECDc b\u1EDD h\u1ED3 n\u01B0\u1EDBc ng\u1ECDt t\u1EF1 nhi\xEAn r\u1ED9ng 500ha khi n\u1EAFng chi\u1EC1u nhu\u1ED9m v\xE0ng."
          },
          {
            time: "19:15 \u2013 21:15",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "\u0110\xEAm l\u1EEDa tr\u1EA1i & R\u01B0\u1EE3u c\u1EA7n M\u2019n\xF4ng R\u2019l\xE2m",
            location: "Bu\xF4n Jun \u2022 Ven H\u1ED3 L\u1EAFk",
            x: 525,
            y: 332,
            desc: "Giao l\u01B0u v\u0103n h\xF3a c\u1ED3ng chi\xEAng b\xEAn \xE1nh l\u1EEDa v\xE0 th\u01B0\u1EDFng th\u1EE9c ch\u1EA3 c\xE1 th\xE1c l\xE1c H\u1ED3 L\u1EAFk."
          }
        ]
      },
      {
        day: "Ng\xE0y 3",
        title: "B\xECnh minh Thuy\u1EC1n \u0111\u1ED9c m\u1ED9c & Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i",
        area: "H\u1ED3 L\u1EAFk \u2192 S\xE2n bay BMV \u2022 ~42 km",
        slots: [
          {
            time: "05:45 \u2013 07:30",
            period: "S\xE1ng s\u1EDBm",
            title: "Ch\xE8o Thuy\u1EC1n \u0110\u1ED9c M\u1ED9c Gi\u1EEFa S\u01B0\u01A1ng S\u1EDBm",
            location: "B\u1EBFn thuy\u1EC1n Bu\xF4n L\xEA \u2022 H\u1ED3 L\u1EAFk",
            x: 562,
            y: 302,
            desc: "L\u01B0\u1EDBt nh\u1EB9 tr\xEAn m\u1EB7t n\u01B0\u1EDBc b\u1EA3ng l\u1EA3ng s\u01B0\u01A1ng m\xF9 khi nh\u1EEFng tia n\u1EAFng \u0111\u1EA7u ti\xEAn ch\u1EA1m \u0111\u1EC9nh n\xFAi Ch\u01B0 Yang Sin."
          },
          {
            time: "08:30 \u2013 10:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "C\xE0 ph\xEA \u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i",
            location: "\u0110\u1ED3i l\u1ECBch s\u1EED Li\xEAn S\u01A1n \u2022 H\u1ED3 L\u1EAFk",
            x: 515,
            y: 288,
            desc: "Ng\u1EAFm tr\u1ECDn g\xF3c nh\xECn 360 \u0111\u1ED9 xu\u1ED1ng m\u1EB7t h\u1ED3 L\u1EAFk v\xE0 c\xE1nh \u0111\u1ED3ng l\xFAa M\u2019n\xF4ng t\u1EEB dinh th\u1EF1 c\u1ED5 tr\xEAn \u0111\u1ED3i cao."
          },
          {
            time: "13:30 \u2013 16:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Mua \u0110\u1EB7c s\u1EA3n M\u1EADt ong Hoa C\xE0 ph\xEA & Ti\u1EC5n s\xE2n bay",
            location: "QL27 \u2192 S\xE2n bay Bu\xF4n Ma Thu\u1ED9t",
            x: 605,
            y: 176,
            desc: "Gh\xE9 ch\u1ECDn mua m\u1EADt ong hoa c\xE0 ph\xEA nguy\xEAn ch\u1EA5t, b\u1ED9t cacao \u0110\u1EAFk L\u1EAFk v\xE0 h\u1EA1t Robusta rang m\u1ED9c tr\u01B0\u1EDBc gi\u1EDD kh\u1EDFi h\xE0nh."
          }
        ]
      },
      {
        day: "Ng\xE0y 4",
        title: "M\u1EDF r\u1ED9ng: Th\xE1c Dray Nur & D\xF2ng S\xEAr\xEAp\u1ED1k Ch\u1EA3y Ng\u01B0\u1EE3c",
        area: "Nam Bu\xF4n Ma Thu\u1ED9t \u2022 ~54 km",
        slots: [
          {
            time: "08:00 \u2013 11:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Chinh ph\u1EE5c Th\xE1c Dray Nur H\xF9ng V\u0129",
            location: "C\u1EE5m th\xE1c Dray Nur \u2022 Kr\xF4ng Ana",
            x: 268,
            y: 285,
            desc: "Chi\xEAm ng\u01B0\u1EE1ng b\u1EE9c t\u01B0\u1EDDng n\u01B0\u1EDBc tr\u1EAFng x\xF3a r\u1ED9ng 250m v\xE0 \u0111i qua c\u1EA7u treo ng\u1EAFm v\xE1ch \u0111\xE1 bazan c\u1ED5 \u0111\u1EA1i."
          },
          {
            time: "14:00 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "\u0110\u1EA1p xe Xuy\xEAn R\u1EEBng & Ch\xE8o SUP S\xF4ng S\xEAr\xEAp\u1ED1k",
            location: "Bu\xF4n Ku\u1ED1p \u2022 L\u01B0u v\u1EF1c S\xEAr\xEAp\u1ED1k",
            x: 305,
            y: 252,
            desc: "H\xE0nh tr\xECnh s\u1ED1ng ch\u1EADm gi\u1EEFa thi\xEAn nhi\xEAn hoang s\u01A1 tr\u01B0\u1EDBc khi kh\xE9p l\u1EA1i chuy\u1EBFn \u0111i tr\u1ECDn v\u1EB9n."
          }
        ]
      }
    ]
  },
  culture: {
    relatedArticleKey: "gong",
    title: "L\u1EAFng Nghe \xC2m Vang Chi\xEAng Knah & K\xFD \u1EE8c Nh\xE0 D\xE0i M\u1EABu H\u1EC7",
    hiddenGem: "L\xE0ng g\u1ED1m c\u1ED5 kh\xF4ng b\xE0n xoay Yang Tao & Kh\xF4ng gian di\u1EC5n x\u01B0\u1EDBng s\u1EED thi \u0110am San.",
    routeTip: "K\u1EBFt n\u1ED1i c\u1EE5m di s\u1EA3n \u0111\xF4 th\u1ECB BMT (B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk \u2013 Ako Dh\xF4ng) sang v\xF9ng v\u0103n h\xF3a M\u2019n\xF4ng Huy\u1EC7n L\u1EAFk.",
    totalKmBase: 146,
    days: [
      {
        day: "Ng\xE0y 1",
        title: "Ki\u1EBFn tr\xFAc Nh\xE0 D\xE0i & C\u1EA7u thang C\xE1i M\u1EABu h\u1EC7",
        area: "Trung t\xE2m V\u0103n h\xF3a BMT \u2022 ~18 km",
        slots: [
          {
            time: "08:00 \u2013 10:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk & Kh\xF4ng gian \u0110a d\u1EA1ng Sinh h\u1ECDc",
            location: "S\u1ED1 12 L\xEA Du\u1EA9n \u2022 BMT",
            x: 378,
            y: 196,
            desc: "Kh\xE1m ph\xE1 b\u1ED9 s\u01B0u t\u1EADp chi\xEAng \u0111\u1ED3ng c\u1ED5, th\u1ED5 c\u1EA9m Kteh v\xE0 l\u1ECBch s\u1EED 49 d\xE2n t\u1ED9c c\xF9ng chung s\u1ED1ng tr\xEAn cao nguy\xEAn."
          },
          {
            time: "10:45 \u2013 12:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "B\u1EEFa c\u01A1m Gia \u0111\xECnh \xCA \u0110\xEA B\xEAn B\u1EBFp L\u1EEDa",
            location: "Bu\xF4n Ako Dh\xF4ng \u2022 BMT",
            x: 394,
            y: 152,
            desc: "Th\u01B0\u1EDFng th\u1EE9c canh b\u1ED9t l\xE1 b\xE9p, c\xE0 \u0111\u1EAFng gi\xE3 c\xE1 kh\xF4 v\xE0 t\xECm hi\u1EC3u phong t\u1EE5c th\u1EEBa k\u1EBF m\u1EABu h\u1EC7 c\u1EE7a ng\u01B0\u1EDDi con g\xE1i \xFAt."
          },
          {
            time: "15:00 \u2013 17:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m Bu\xF4n T\u01A1ng J\xFA",
            location: "X\xE3 Ea Kao \u2022 TP. Bu\xF4n Ma Thu\u1ED9t",
            x: 342,
            y: 235,
            desc: "Xem ngh\u1EC7 nh\xE2n nhu\u1ED9m s\u1EE3i b\xF4ng b\u1EB1ng v\u1ECF c\xE2y r\u1EEBng v\xE0 t\u1EF1 tay d\u1EC7t th\u1EED hoa v\u0103n h\xECnh h\u1ECDc truy\u1EC1n th\u1ED1ng."
          },
          {
            time: "19:30 \u2013 21:30",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "\u0110\xEAm H\u1ED9i Di\u1EC5n X\u01B0\u1EDBng Chi\xEAng Knah & S\u1EED Thi",
            location: "Nh\xE0 D\xE0i C\u1ED5 \u2022 Ako Dh\xF4ng",
            x: 388,
            y: 164,
            desc: "Ng\u1ED3i tr\xEAn gh\u1EBF Kpan d\xE0i 18m l\u1EAFng nghe h\xF2a t\u1EA5u chi\xEAng \u0111\u1ED3ng v\xE0 l\u1EDDi k\u1EC3 khan \u0110am San tr\u1EA7m h\xF9ng."
          }
        ]
      },
      {
        day: "Ng\xE0y 2",
        title: "G\u1ED1m c\u1ED5 Kh\xF4ng b\xE0n xoay Yang Tao & Bu\xF4n Jun",
        area: "QL27 \u2192 Yang Tao \u2192 Huy\u1EC7n L\u1EAFk \u2022 ~68 km",
        slots: [
          {
            time: "08:00 \u2013 11:15",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Ngh\u1EC7 nh\xE2n G\u1ED1m C\u1ED5 M\u2019n\xF4ng R\u2019l\xE2m Yang Tao",
            location: "X\xE3 Yang Tao \u2022 Huy\u1EC7n L\u1EAFk",
            x: 482,
            y: 262,
            desc: "Ch\u1EE9ng ki\u1EBFn k\u1EF9 thu\u1EADt l\xE0m g\u1ED1m ho\xE0n to\xE0n b\u1EB1ng tay ch\u1EA1y quanh v\u1EADt m\u1EABu v\xE0 nung l\u1ED9 thi\xEAn b\u1EB1ng c\u1EE7i kh\xF4."
          },
          {
            time: "14:00 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Kh\xE1m ph\xE1 Bu\xF4n Jun & Bu\xF4n L\xEA C\u1ED5 K\xEDnh",
            location: "Ven H\u1ED3 L\u1EAFk \u2022 Huy\u1EC7n L\u1EAFk",
            x: 542,
            y: 318,
            desc: "D\u1EA1o b\u01B0\u1EDBc gi\u1EEFa nh\u1EEFng ng\xF4i nh\xE0 s\xE0n truy\u1EC1n th\u1ED1ng c\u1EE7a ng\u01B0\u1EDDi M\u2019n\xF4ng n\u1EB1m y\xEAn b\xECnh d\u01B0\u1EDBi r\u1EB7ng d\u1EEBa v\xE0 b\xF3ng c\u1ED5 th\u1EE5."
          },
          {
            time: "19:00 \u2013 21:00",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "Nghi th\u1EE9c M\u1EDDi R\u01B0\u1EE3u C\u1EA7n & \u0110\xE0n \u0110\xE1",
            location: "Nh\xE0 s\xE0n Bu\xF4n Jun \u2022 H\u1ED3 L\u1EAFk",
            x: 528,
            y: 334,
            desc: "T\xECm hi\u1EC3u quy t\u1EAFc c\u1EA7m c\u1EA7n r\u01B0\u1EE3u theo th\u1EE9 b\u1EADc m\u1EABu h\u1EC7 v\xE0 th\u01B0\u1EDFng th\u1EE9c \xE2m thanh trong tr\u1EBBo c\u1EE7a \u0111\xE0n \u0111\xE1, \u0111\xE0n T\u2019r\u01B0ng."
          }
        ]
      },
      {
        day: "Ng\xE0y 3",
        title: "B\u1EBFn N\u01B0\u1EDBc \u0110\u1EA7u Bu\xF4n & V\u0103n Minh C\xE0 Ph\xEA",
        area: "H\u1ED3 L\u1EAFk \u2192 Bu\xF4n Ma Thu\u1ED9t \u2022 ~60 km",
        slots: [
          {
            time: "07:30 \u2013 09:45",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Th\u0103m B\u1EBFn N\u01B0\u1EDBc C\u1ED5 Thi\xEAng Li\xEAng (Kpin Ea)",
            location: "Ngo\u1EA1i \xF4 Bu\xF4n Ma Thu\u1ED9t",
            x: 418,
            y: 185,
            desc: "L\u1EAFng nghe c\xE2u chuy\u1EC7n b\u1EA3o v\u1EC7 r\u1EEBng \u0111\u1EA7u ngu\u1ED3n v\xE0 nghi l\u1EC5 t\u1EA1 \u01A1n th\u1EA7n n\u01B0\u1EDBc h\xE0ng n\u0103m c\u1EE7a c\u1ED9ng \u0111\u1ED3ng \xCA \u0110\xEA."
          },
          {
            time: "10:15 \u2013 12:30",
            period: "Gi\u1EEFa s\xE1ng",
            title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA & Tri\u1EC3n l\xE3m \u0110\u01B0\u01A1ng \u0111\u1EA1i",
            location: "\u0110\u01B0\u1EDDng Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u \u2022 BMT",
            x: 405,
            y: 172,
            desc: "Tr\u1EA3i nghi\u1EC7m s\u1EF1 giao thoa gi\u1EEFa di s\u1EA3n b\u1EA3n \u0111\u1ECBa ng\xE0n n\u0103m v\xE0 ng\xF4n ng\u1EEF thi\u1EBFt k\u1EBF ki\u1EBFn tr\xFAc hi\u1EC7n \u0111\u1EA1i."
          },
          {
            time: "14:30 \u2013 16:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Qu\xE0 t\u1EB7ng Th\u1EE7 c\xF4ng Th\u1ED5 c\u1EA9m & Kh\u1EDFi h\xE0nh",
            location: "Trung t\xE2m BMT \u2192 S\xE2n bay BMV",
            x: 605,
            y: 176,
            desc: "Ch\u1ECDn mua kh\u0103n cho\xE0ng th\u1ED5 c\u1EA9m d\u1EC7t tay, t\xFAi Kteh v\xE0 c\xE0 ph\xEA \u0111\u1EB7c s\u1EA3n l\xE0m qu\xE0 l\u01B0u ni\u1EC7m."
          }
        ]
      },
      {
        day: "Ng\xE0y 4",
        title: "M\u1EDF r\u1ED9ng: Giao thoa V\u0103n h\xF3a B\u1EA3n \u0110\xF4n (\xCA \u0110\xEA \u2013 M\u2019n\xF4ng \u2013 L\xE0o)",
        area: "T\xE2y B\u1EAFc BMT \u2022 ~85 km kh\u1EE9 h\u1ED3i",
        slots: [
          {
            time: "08:00 \u2013 11:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Nh\xE0 S\xE0n C\u1ED5 Vua S\u0103n Voi Khunjunob",
            location: "X\xE3 Kr\xF4ng Na \u2022 Bu\xF4n \u0110\xF4n",
            x: 155,
            y: 125,
            desc: "Tham quan ng\xF4i nh\xE0 s\xE0n g\u1ED7 ki\u1EBFn tr\xFAc L\xE0o \u2013 M\u2019n\xF4ng h\u01A1n 130 n\u0103m tu\u1ED5i l\u01B0u gi\u1EEF k\u1EF7 v\u1EADt ngh\u1EC1 thu\u1EA7n d\u01B0\u1EE1ng voi."
          },
          {
            time: "14:00 \u2013 16:45",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k & R\u1EB7ng Si C\u1ED5 Th\u1EE5",
            location: "\u0110\u1EA3o \xC2m Ph\u1EE7 \u2022 Bu\xF4n \u0110\xF4n",
            x: 182,
            y: 142,
            desc: "\u0110i b\u1ED9 qua nh\u1EEFng nh\u1ECBp c\u1EA7u treo tre l\u1EAFc l\u01B0 d\u01B0\u1EDBi v\xF2m r\u1EC5 si kh\u1ED5ng l\u1ED3 gi\u1EEFa l\xF2ng s\xF4ng S\xEAr\xEAp\u1ED1k."
          }
        ]
      }
    ]
  },
  nature: {
    relatedArticleKey: "waterfalls",
    title: "Chinh Ph\u1EE5c C\u1EE5m Th\xE1c S\xEAr\xEAp\u1ED1k & R\u1EEBng Kh\u1ED9p Nguy\xEAn Sinh Yok \u0110\xF4n",
    hiddenGem: "\u0110\u01B0\u1EDDng m\xF2n xuy\xEAn r\u1EEBng \u0111\u1EB7c d\u1EE5ng n\u1ED1i th\xE1c Dray Nur \u2013 Dray S\xE1p & \u0110\xE1 Voi M\u1EB9 Yang Tao.",
    routeTip: "Chia 2 h\u01B0\u1EDBng r\xF5 r\u1EC7t: H\u01B0\u1EDBng Nam (Th\xE1c Dray Nur) v\xE0 H\u01B0\u1EDBng T\xE2y B\u1EAFc (Yok \u0110\xF4n \u2013 B\u1EA3n \u0110\xF4n) gi\xFAp tr\u1ECDn v\u1EB9n th\u1EDDi gian.",
    totalKmBase: 175,
    days: [
      {
        day: "Ng\xE0y 1",
        title: "C\u1EE5m Th\xE1c Dray Nur \u2013 Dray S\xE1p & S\xF4ng Ch\u1EA3y Ng\u01B0\u1EE3c",
        area: "H\u01B0\u1EDBng Nam BMT \u2022 ~58 km",
        slots: [
          {
            time: "07:30 \u2013 10:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Chi\xEAm ng\u01B0\u1EE1ng B\u1EE9c T\u01B0\u1EDDng N\u01B0\u1EDBc Th\xE1c Dray Nur",
            location: "X\xE3 Dray S\xE1p \u2022 Kr\xF4ng Ana",
            x: 265,
            y: 288,
            desc: "\u0110\u1EE9ng tr\u01B0\u1EDBc ng\u1ECDn th\xE1c r\u1ED9ng 250m tung b\u1ECDt tr\u1EAFng x\xF3a v\xE0 kh\xE1m ph\xE1 hang \u0111\xE1 bazan ph\xEDa sau m\xE0n n\u01B0\u1EDBc."
          },
          {
            time: "10:45 \u2013 13:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "\u0110\u1EA1p Xe Xuy\xEAn R\u1EEBng \u0110\u1EB7c D\u1EE5ng & Th\xE1c Gia Long",
            location: "Tuy\u1EBFn r\u1EEBng Bu\xF4n Ku\u1ED1p \u2013 Dray S\xE1p",
            x: 298,
            y: 262,
            desc: "\u0110\u1EA1p xe d\u01B0\u1EDBi t\xE1n r\u1EEBng c\u1ED5 th\u1EE5 d\u1ECDc b\u1EDD s\xF4ng S\xEAr\xEAp\u1ED1k v\xE0 d\xF9ng b\u1EEFa tr\u01B0a d\xE3 ngo\u1EA1i b\xEAn su\u1ED1i m\xE1t."
          },
          {
            time: "14:30 \u2013 17:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Ch\xE8o Thuy\u1EC1n Kayak / SUP Tr\xEAn S\xF4ng S\xEAr\xEAp\u1ED1k",
            location: "H\u1EA1 l\u01B0u th\xE1c Dray Nur",
            x: 242,
            y: 274,
            desc: "Th\u1EA3 m\xECnh tr\xEAn d\xF2ng s\xF4ng ch\u1EA3y ng\u01B0\u1EE3c k\u1EF3 th\xFA gi\u1EEFa hai v\xE1ch \u0111\xE1 n\xFAi l\u1EEDa h\xF9ng v\u0129."
          },
          {
            time: "19:00 \u2013 21:00",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "Ngh\u1EC9 \u0111\xEAm Ph\u1ED1 n\xFAi & Th\u01B0\u1EDFng th\u1EE9c C\xE1 L\u0103ng",
            location: "TP. Bu\xF4n Ma Thu\u1ED9t",
            x: 378,
            y: 196,
            desc: "Th\u01B0\u1EDFng th\u1EE9c l\u1EA9u c\xE1 l\u0103ng s\xF4ng S\xEAr\xEAp\u1ED1k t\u01B0\u01A1i ng\u1ECDt v\xE0 n\u1EA1p n\u0103ng l\u01B0\u1EE3ng cho ng\xE0y trekking r\u1EEBng kh\u1ED9p."
          }
        ]
      },
      {
        day: "Ng\xE0y 2",
        title: "Trekking R\u1EEBng Kh\u1ED9p Yok \u0110\xF4n & Du L\u1ECBch Th\xE2n Thi\u1EC7n C\xF9ng Voi",
        area: "H\u01B0\u1EDBng T\xE2y B\u1EAFc (TL1) \u2022 ~86 km",
        slots: [
          {
            time: "07:30 \u2013 11:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "\u0110i B\u1ED9 D\u01B0\u1EDBi T\xE1n R\u1EEBng Kh\u1ED9p C\xF9ng Voi T\u1EF1 Nhi\xEAn",
            location: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n",
            x: 132,
            y: 112,
            desc: "H\xE0nh tr\xECnh nh\xE2n v\u0103n kh\xF4ng c\u01B0\u1EE1i voi: theo ch\xE2n ki\u1EC3m l\xE2m quan s\xE1t \u0111\xE0n voi t\u1EF1 do ki\u1EBFm \u0103n b\xEAn su\u1ED1i r\u1EEBng."
          },
          {
            time: "12:00 \u2013 13:45",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "\u1EA8m th\u1EF1c B\u1EA3n \u0110\xF4n B\xEAn B\u1EDD S\xF4ng S\xEAr\xEAp\u1ED1k",
            location: "Trung t\xE2m Du l\u1ECBch B\u1EA3n \u0110\xF4n",
            x: 168,
            y: 135,
            desc: "Th\u01B0\u1EDFng th\u1EE9c g\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n ch\u1EA5m mu\u1ED1i s\u1EA3 \u1EDBt r\u1EEBng v\xE0 c\u01A1m lam n\u01B0\u1EDBng \u1ED1ng tre non."
          },
          {
            time: "14:30 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Kh\xE1m Ph\xE1 H\u1EC7 Sinh Th\xE1i R\u1EEBng R\u1EE5ng L\xE1 M\xF9a Kh\xF4",
            location: "Tr\u1EA1m Ki\u1EC3m l\xE2m Yok \u0110\xF4n",
            x: 115,
            y: 148,
            desc: "T\xECm hi\u1EC3u h\u1EC7 \u0111\u1ED9ng th\u1EF1c v\u1EADt qu\xFD hi\u1EBFm c\u1EE7a khu r\u1EEBng \u0111\u1EB7c d\u1EE5ng l\u1EDBn nh\u1EA5t Vi\u1EC7t Nam (h\u01A1n 115.000 ha)."
          }
        ]
      },
      {
        day: "Ng\xE0y 3",
        title: "\u0110\xE1 Voi M\u1EB9 Yang Tao & B\xECnh Y\xEAn H\u1ED3 L\u1EAFk",
        area: "H\u01B0\u1EDBng \u0110\xF4ng Nam (QL27) \u2022 ~64 km",
        slots: [
          {
            time: "08:00 \u2013 10:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Chinh Ph\u1EE5c \u0110\u1EC9nh \u0110\xE1 Voi M\u1EB9 Yang Tao",
            location: "X\xE3 Yang Tao \u2022 Qu\u1ED1c l\u1ED9 27",
            x: 478,
            y: 256,
            desc: "Leo nh\u1EB9 15 ph\xFAt l\xEAn l\u01B0ng t\u1EA3ng \u0111\xE1 nguy\xEAn kh\u1ED1i d\xE0i 200m \u0111\xF3n gi\xF3 l\u1ED9ng v\xE0 ng\u1EAFm d\xE3y Ch\u01B0 Yang Sin."
          },
          {
            time: "11:00 \u2013 14:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "Ngh\u1EC9 Ng\u01A1i & Ch\xE8o \u0110\u1ED9c M\u1ED9c H\u1ED3 L\u1EAFk",
            location: "H\u1ED3 L\u1EAFk \u2022 Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n",
            x: 545,
            y: 315,
            desc: "Th\u01B0 gi\xE3n b\xEAn m\u1EB7t h\u1ED3 t\u0129nh l\u1EB7ng tr\u01B0\u1EDBc khi quay v\u1EC1 s\xE2n bay Bu\xF4n Ma Thu\u1ED9t."
          },
          {
            time: "15:30 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Di chuy\u1EC3n v\u1EC1 S\xE2n bay Bu\xF4n Ma Thu\u1ED9t",
            location: "QL27 \u2192 S\xE2n bay BMV",
            x: 605,
            y: 176,
            desc: "K\u1EBFt th\xFAc cung \u0111\u01B0\u1EDDng kh\xE1m ph\xE1 thi\xEAn nhi\xEAn \u2013 sinh th\xE1i \u0110\u1EAFk L\u1EAFk."
          }
        ]
      },
      {
        day: "Ng\xE0y 4",
        title: "M\u1EDF r\u1ED9ng: Trekking Ch\xE2n N\xFAi Ch\u01B0 Yang Sin & Th\xE1c B\xECm B\u1ECBp",
        area: "VQG Ch\u01B0 Yang Sin \u2022 ~45 km",
        slots: [
          {
            time: "07:30 \u2013 12:00",
            period: "Bu\u1ED5i s\xE1ng",
            title: "B\u0103ng R\u1EEBng Th\u01B0\u1EDDng Xanh T\u1EDBi Th\xE1c B\xECm B\u1ECBp",
            location: "V\u01B0\u1EDDn Qu\u1ED1c gia Ch\u01B0 Yang Sin",
            x: 598,
            y: 342,
            desc: "L\u1ED9i su\u1ED1i \u0111\xE1 trong v\u1EAFt d\u01B0\u1EDBi t\xE1n th\xF4ng c\u1ED5 th\u1EE5 v\xE0 p\u01A1-mu ng\xE0n n\u0103m tu\u1ED5i."
          },
          {
            time: "14:00 \u2013 16:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Th\u01B0\u1EDFng Th\u1EE9c Tr\xE0 Th\u1EA3o M\u1ED9c & C\xE0 Ph\xEA C\u1ED5 Th\u1EE5",
            location: "Thung l\u0169ng Yang Tao",
            x: 495,
            y: 275,
            desc: "Ngh\u1EC9 ng\u01A1i th\u01B0 gi\xE3n gi\u1EEFa kh\xF4ng kh\xED trong l\xE0nh c\u1EE7a v\xF9ng \u0111\u1EC7m Ch\u01B0 Yang Sin."
          }
        ]
      }
    ]
  },
  cuisine: {
    relatedArticleKey: "cuisine",
    title: "B\u1EA3n Giao H\u01B0\u1EDFng V\u1ECB Gi\xE1c N\xFAi R\u1EEBng \u0110\u1EAFk L\u1EAFk",
    hiddenGem: "B\u1EEFa c\u01A1m m\u1EABu h\u1EC7 t\u1EA1i b\u1EBFp l\u1EEDa nh\xE0 d\xE0i v\u1EDBi canh l\xE1 b\xE9p, c\xE0 \u0111\u1EAFng gi\xE3 ki\u1EBFn v\xE0ng & r\u01B0\u1EE3u c\u1EA7n \u1EE7 tr\u1EA5u.",
    routeTip: "K\u1EBFt h\u1EE3p tr\u1EA3i nghi\u1EC7m \u1EA9m th\u1EF1c theo khung gi\u1EDD: B\xFAn \u0111\u1ECF bu\u1ED5i chi\u1EC1u, g\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n bu\u1ED5i tr\u01B0a, c\xE0 ph\xEA v\u1EE3t \u0111\xEAm.",
    totalKmBase: 132,
    days: [
      {
        day: "Ng\xE0y 1",
        title: "Food Tour Ph\u1ED1 N\xFAi Bu\xF4n Ma Thu\u1ED9t T\u1EEB S\xE1ng \u0110\u1EBFn \u0110\xEAm",
        area: "TP. Bu\xF4n Ma Thu\u1ED9t \u2022 ~20 km",
        slots: [
          {
            time: "07:30 \u2013 09:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "B\xFAn Ch\xECa Ban M\xEA & C\xE0 Ph\xEA V\u1EE3t C\u1ED5 Truy\u1EC1n",
            location: "Khu ph\u1ED1 c\u1ED5 Phan \u0110\xECnh Gi\xF3t \u2022 BMT",
            x: 372,
            y: 194,
            desc: "Th\u01B0\u1EDFng th\u1EE9c t\xF4 b\xFAn ch\xECa ng\u1ECDt thanh ninh t\u1EEB gi\xF2 sau heo v\xE0 ly c\xE0 ph\xEA v\u1EE3t th\u01A1m l\u1EEBng h\u01B0\u01A1ng kh\xF3i."
          },
          {
            time: "11:30 \u2013 13:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "B\xE1nh \u01AF\u1EDBt Th\u1ECBt N\u01B0\u1EDBng \u0110\u0129a Ch\u1ED3ng Tr\u1EA7n Nh\u1EADt Du\u1EADt",
            location: "\u0110\u01B0\u1EDDng Tr\u1EA7n Nh\u1EADt Du\u1EADt \u2022 BMT",
            x: 388,
            y: 162,
            desc: "Cu\u1ED1n t\u1EEBng \u0111\u0129a b\xE1nh \u01B0\u1EDBt n\xF3ng h\u1ED5i c\xF9ng th\u1ECBt n\u01B0\u1EDBng than h\u1ED3ng, d\u01B0a c\u1EA3i chua, xo\xE0i xanh v\xE0 t\u01B0\u01A1ng n\u1EBFp."
          },
          {
            time: "15:30 \u2013 17:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Kem B\u01A1 S\xE1p \u0110\u1EAFk L\u1EAFk & Workshop Cacao Th\u1EE7 C\xF4ng",
            location: "Ng\xE3 S\xE1u Bu\xF4n Ma Thu\u1ED9t",
            x: 396,
            y: 185,
            desc: "N\u1EBFm v\u1ECB b\xE9o m\u1ECBn c\u1EE7a b\u01A1 s\xE1p \u0111\u1EA5t \u0111\u1ECF k\u1EBFt h\u1EE3p kem d\u1EEBa non v\xE0 t\xECm hi\u1EC3u quy tr\xECnh l\xE0m socola th\u1EE7 c\xF4ng."
          },
          {
            time: "19:00 \u2013 21:30",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "B\xFAn \u0110\u1ECF Ban M\xEA & L\u1EA9u L\xE1 R\u1EEBng",
            location: "\u0110\u01B0\u1EDDng Phan \u0110\xECnh Gi\xF3t \u2013 L\xEA H\u1ED3ng Phong",
            x: 365,
            y: 210,
            desc: "Tr\u1EA3i nghi\u1EC7m m\xF3n b\xFAn \u0111\u1ECF \u0111\u1EB7c tr\u01B0ng ch\u1EC9 xu\u1EA5t hi\u1EC7n khi ph\u1ED1 l\xEAn \u0111\xE8n v\xE0 n\u1ED3i l\u1EA9u h\u01A1n 10 lo\u1EA1i l\xE1 r\u1EEBng T\xE2y Nguy\xEAn."
          }
        ]
      },
      {
        day: "Ng\xE0y 2",
        title: "H\u01B0\u01A1ng V\u1ECB B\u1EA3n \u0110\xF4n & \u0110\u1EB7c S\u1EA3n S\xF4ng S\xEAr\xEAp\u1ED1k",
        area: "Bu\xF4n Ma Thu\u1ED9t \u2192 B\u1EA3n \u0110\xF4n \u2022 ~76 km",
        slots: [
          {
            time: "08:30 \u2013 11:00",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Th\u0103m V\u01B0\u1EDDn Ti\xEAu R\u1EEBng, Cacao & M\u1EAFc-ca",
            location: "Tuy\u1EBFn \u0111\u01B0\u1EDDng \u0111i Bu\xF4n \u0110\xF4n",
            x: 255,
            y: 158,
            desc: "T\xECm hi\u1EC3u c\xE1c lo\u1EA1i gia v\u1ECB b\u1EA3n \u0111\u1ECBa: h\u1EA1t ti\xEAu r\u1EEBng, \u1EDBt xi\xEAm xanh, l\xE1 \xE9 tr\u1EAFng v\xE0 h\u1EA1t m\u1EAFc-ca n\u01B0\u1EDBng c\u1EE7i."
          },
          {
            time: "11:30 \u2013 14:00",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "G\xE0 N\u01B0\u1EDBng B\u1EA3n \u0110\xF4n & C\u01A1m Lam \u1ED0ng N\u1EE9a Non",
            location: "B\u1EBFn n\u01B0\u1EDBc S\xEAr\xEAp\u1ED1k \u2022 B\u1EA3n \u0110\xF4n",
            x: 165,
            y: 132,
            desc: "G\xE0 th\u1EA3 v\u01B0\u1EDDn k\u1EB9p thanh tre n\u01B0\u1EDBng v\xE0ng \u01B0\u01A1m tr\xEAn than h\u1ED3ng, ch\u1EA5m mu\u1ED1i s\u1EA3 l\xE1 \xE9 \u0103n k\xE8m c\u01A1m lam d\u1EBBo th\u01A1m."
          },
          {
            time: "17:30 \u2013 20:30",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "B\u1EEFa Ti\u1EC7c C\xE1 L\u0103ng S\xF4ng S\xEAr\xEAp\u1ED1k & R\u01B0\u1EE3u C\u1EA7n",
            location: "Nh\xE0 d\xE0i Bu\xF4n Ako Dh\xF4ng \u2022 BMT",
            x: 392,
            y: 150,
            desc: "Th\u01B0\u1EDFng th\u1EE9c c\xE1 l\u0103ng n\u01B0\u1EDBng mu\u1ED1i \u1EDBt, canh chua c\xE1 l\u0103ng m\u0103ng r\u1EEBng v\xE0 nh\u1EA5p r\u01B0\u1EE3u c\u1EA7n \u1EE7 men l\xE1 ng\u1ECDt d\u1ECBu."
          }
        ]
      },
      {
        day: "Ng\xE0y 3",
        title: "\u1EA8m Th\u1EF1c M\u2019n\xF4ng Ven H\u1ED3 L\u1EAFk & Qu\xE0 T\u1EB7ng N\xF4ng S\u1EA3n",
        area: "H\u1ED3 L\u1EAFk \u2192 S\xE2n bay BMV \u2022 ~56 km",
        slots: [
          {
            time: "08:30 \u2013 11:00",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Tr\u1EA3i Nghi\u1EC7m B\u1EBFp L\u1EEDa Nh\xE0 D\xE0i: Canh L\xE1 B\xE9p & C\xE0 \u0110\u1EAFng",
            location: "Bu\xF4n Jun \u2022 H\u1ED3 L\u1EAFk",
            x: 538,
            y: 318,
            desc: "C\xF9ng ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF M\u2019n\xF4ng ch\u1EBF bi\u1EBFn m\xF3n c\xE0 \u0111\u1EAFng gi\xE3 c\xE1 c\u01A1m kh\xF4, \u0111\u1ECDt m\xE2y n\u01B0\u1EDBng v\xE0 canh l\xE1 b\xE9p ng\u1ECDt thanh."
          },
          {
            time: "11:30 \u2013 13:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "Ch\u1EA3 C\xE1 Th\xE1c L\xE1c H\u1ED3 L\u1EAFk & L\u01B0\u01A1n \u0110\u1ED3ng Um Chu\u1ED1i",
            location: "Ven H\u1ED3 L\u1EAFk \u2022 Huy\u1EC7n L\u1EAFk",
            x: 552,
            y: 305,
            desc: "Th\u01B0\u1EDFng th\u1EE9c \u0111\u1EB7c s\u1EA3n tr\u1EE9 danh \u0111\xE1nh b\u1EAFt tr\u1EF1c ti\u1EBFp t\u1EEB l\xF2ng h\u1ED3 n\u01B0\u1EDBc ng\u1ECDt r\u1ED9ng 500ha."
          },
          {
            time: "15:00 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Mua S\u1EAFm N\xF4ng S\u1EA3n \u0110\u1EB7c S\u1EA3n \u0110\u1EAFk L\u1EAFk",
            location: "Trung t\xE2m BMT \u2192 S\xE2n bay BMV",
            x: 605,
            y: 176,
            desc: "\u0110\xF3ng g\xF3i c\xE0 ph\xEA Fine Robusta, m\u1EADt ong hoa c\xE0 ph\xEA, h\u1EA1t m\u1EAFc-ca, b\xF2 kh\xF4 th\u1ED1 \u0111\u1EA5t v\xE0 mu\u1ED1i ki\u1EBFn v\xE0ng."
          }
        ]
      },
      {
        day: "Ng\xE0y 4",
        title: "M\u1EDF r\u1ED9ng: Tr\u1EA3i Nghi\u1EC7m Rang C\xE0 Ph\xEA C\u1EE7i & \u1EA8m Th\u1EF1c Th\xE1c N\u01B0\u1EDBc",
        area: "C\u1EE5m th\xE1c Dray Nur \u2022 ~52 km",
        slots: [
          {
            time: "08:30 \u2013 11:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "T\u1EF1 Tay Rang C\xE0 Ph\xEA Ch\u1EA3o Gang B\xEAn Su\u1ED1i",
            location: "Khu sinh th\xE1i Dray Nur",
            x: 268,
            y: 285,
            desc: "L\u1EAFng nghe ti\u1EBFng h\u1EA1t c\xE0 ph\xEA n\u1ED5 l\xE1ch t\xE1ch tr\xEAn b\u1EBFp c\u1EE7i v\xE0 pha phin th\u01B0\u1EDFng th\u1EE9c ngay b\xEAn d\xF2ng th\xE1c m\xE1t l\xE0nh."
          },
          {
            time: "12:00 \u2013 14:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "Heo R\u1EEBng Lai N\u01B0\u1EDBng \u1ED0ng Tre & Rau R\u1EEBng Lu\u1ED9c",
            location: "Bu\xF4n Ku\u1ED1p \u2022 Kr\xF4ng Ana",
            x: 302,
            y: 256,
            desc: "B\u1EEFa tr\u01B0a \u0111\u1EADm ch\u1EA5t \u0111\u1EA1i ng\xE0n kh\xE9p l\u1EA1i h\xE0nh tr\xECnh kh\xE1m ph\xE1 \u1EA9m th\u1EF1c \u0110\u1EAFk L\u1EAFk."
          }
        ]
      }
    ]
  }
};
var sampleSchedulePresets = [
  {
    key: "coffee",
    badge: "3N2\u0110 \u2022 C\u1EB7p \u0111\xF4i",
    title: "C\xE0 ph\xEA \u0110\u1EB7c s\u1EA3n & S\u01B0\u01A1ng s\u1EDBm H\u1ED3 L\u1EAFk",
    summary: "B\u1EA3o t\xE0ng C\xE0 ph\xEA \u2022 R\u1EABy C\u01B0 M\u2019gar \u2022 Ch\xE8o \u0111\u1ED9c m\u1ED9c Bu\xF4n Jun",
    image: "https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80",
    companion: "couple",
    duration: "3N2D",
    budget: "standard",
    theme: "coffee",
    prompt: "L\xEAn l\u1ECBch tr\xECnh 3N2\u0110 cho c\u1EB7p \u0111\xF4i th\xEDch c\xE0 ph\xEA \u0111\u1EB7c s\u1EA3n, th\u0103m B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, n\xF4ng tr\u1EA1i C\u01B0 M\u2019gar v\xE0 ch\xE8o thuy\u1EC1n ng\u1EAFm b\xECnh minh H\u1ED3 L\u1EAFk."
  },
  {
    key: "culture",
    badge: "3N2\u0110 \u2022 Gia \u0111\xECnh",
    title: "Di s\u1EA3n C\u1ED3ng chi\xEAng & Nh\xE0 D\xE0i M\u1EABu h\u1EC7",
    summary: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng \u2022 D\u1EC7t T\u01A1ng J\xFA \u2022 G\u1ED1m c\u1ED5 Yang Tao",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/18/Tay_Nguyen_gongs.JPG",
    companion: "family",
    duration: "3N2D",
    budget: "standard",
    theme: "culture",
    prompt: "Thi\u1EBFt k\u1EBF l\u1ECBch tr\xECnh 3N2\u0110 cho gia \u0111\xECnh t\xECm hi\u1EC3u v\u0103n h\xF3a C\u1ED3ng chi\xEAng \xCA \u0110\xEA, nh\xE0 d\xE0i m\u1EABu h\u1EC7 Ako Dh\xF4ng, d\u1EC7t th\u1ED5 c\u1EA9m v\xE0 l\xE0ng g\u1ED1m c\u1ED5 Yang Tao."
  },
  {
    key: "nature",
    badge: "2N1\u0110 \u2022 Nh\xF3m b\u1EA1n",
    title: "Th\xE1c Dray Nur & Trekking R\u1EEBng Yok \u0110\xF4n",
    summary: "Ch\xE8o SUP S\xEAr\xEAp\u1ED1k \u2022 R\u1EEBng kh\u1ED9p Yok \u0110\xF4n \u2022 \u0110\xE1 Voi M\u1EB9",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Draynur_falls.jpg",
    companion: "friends",
    duration: "2N1D",
    budget: "standard",
    theme: "nature",
    prompt: "G\u1EE3i \xFD l\u1ECBch tr\xECnh 2N1\u0110 cho nh\xF3m b\u1EA1n kh\xE1m ph\xE1 c\u1EE5m th\xE1c Dray Nur \u2013 s\xF4ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c v\xE0 trekking r\u1EEBng kh\u1ED9p V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n."
  },
  {
    key: "cuisine",
    badge: "3N2\u0110 \u2022 \u0110\u1ED9c h\xE0nh",
    title: "B\u1EA3n Giao H\u01B0\u1EDFng \u1EA8m Th\u1EF1c \u0110\u1EA1i Ng\xE0n",
    summary: "B\xFAn \u0111\u1ECF Ban M\xEA \u2022 G\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n \u2022 C\xE1 l\u0103ng S\xEAr\xEAp\u1ED1k",
    image: "https://images.unsplash.com/photo-1648141643305-efb7d2542602?auto=format&fit=crop&w=1000&q=80",
    companion: "solo",
    duration: "3N2D",
    budget: "standard",
    theme: "cuisine",
    prompt: "M\xECnh \u0111i \u0111\u1ED9c h\xE0nh 3N2\u0110 mu\u1ED1n kh\xE1m ph\xE1 tr\u1ECDn v\u1EB9n \u1EA9m th\u1EF1c b\u1EA3n \u0111\u1ECBa \u0110\u1EAFk L\u1EAFk: b\xFAn \u0111\u1ECF, g\xE0 n\u01B0\u1EDBng c\u01A1m lam B\u1EA3n \u0110\xF4n, c\xE1 l\u0103ng S\xEAr\xEAp\u1ED1k v\xE0 canh l\xE1 b\xE9p."
  }
];

// server/services/ai/aiTraceService.ts
function safeParseOptional(raw) {
  if (raw === null || raw === void 0) return void 0;
  if (typeof raw !== "string") {
    if (typeof raw === "object" && Object.keys(raw).length === 0) {
      return void 0;
    }
    return raw;
  }
  if (!raw || raw === "{}" || raw === "null") return void 0;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length === 0) {
      return void 0;
    }
    return parsed;
  } catch {
    return void 0;
  }
}
function mapRowToTraceRecord(row) {
  return {
    traceId: row.trace_id,
    lang: row.lang === "en" ? "en" : "vi",
    userMessage: row.user_message,
    intent: row.intent,
    status: row.status,
    provider: row.provider,
    intake: safeParseOptional(row.intake_json),
    capacityPlan: safeParseOptional(row.capacity_json),
    budgetResult: safeParseOptional(row.budget_json),
    purposeSelection: safeParseOptional(row.purpose_json),
    evalResult: safeParseOptional(row.eval_json),
    latencyMs: row.latency_ms,
    retryCount: row.retry_count,
    feedbackRating: row.feedback_rating ?? null,
    feedbackComment: row.feedback_comment || void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function saveAiTrace(record) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const createdAt = record.createdAt || now;
  const updatedAt = record.updatedAt || now;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const existing = await getAiTraceById(record.traceId);
    const nextRating = record.feedbackRating ?? existing?.feedbackRating ?? null;
    const trimmedComment = (record.feedbackComment || "").trim();
    const nextComment = trimmedComment || existing?.feedbackComment || "";
    const { error } = await supabase.from("ai_traces").upsert(
      {
        trace_id: record.traceId,
        lang: record.lang,
        user_message: record.userMessage,
        intent: record.intent,
        status: record.status,
        provider: record.provider,
        intake_json: record.intake || {},
        capacity_json: record.capacityPlan || {},
        budget_json: record.budgetResult || {},
        purpose_json: record.purposeSelection || {},
        eval_json: record.evalResult || {},
        latency_ms: Math.max(0, Math.round(record.latencyMs)),
        retry_count: Math.max(0, Math.round(record.retryCount)),
        feedback_rating: nextRating,
        feedback_comment: nextComment,
        created_at: existing?.createdAt || createdAt,
        updated_at: updatedAt
      },
      { onConflict: "trace_id" }
    );
    if (error) {
      throw new Error(`Supabase saveAiTrace failed: ${error.message}`);
    }
    return;
  }
  const db = getDb();
  db.prepare(
    `INSERT INTO ai_traces (
      trace_id, lang, user_message, intent, status, provider,
      intake_json, capacity_json, budget_json, purpose_json, eval_json,
      latency_ms, retry_count, feedback_rating, feedback_comment, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(trace_id) DO UPDATE SET
      status = excluded.status,
      provider = excluded.provider,
      intake_json = excluded.intake_json,
      capacity_json = excluded.capacity_json,
      budget_json = excluded.budget_json,
      purpose_json = excluded.purpose_json,
      eval_json = excluded.eval_json,
      latency_ms = excluded.latency_ms,
      retry_count = excluded.retry_count,
      feedback_rating = COALESCE(excluded.feedback_rating, ai_traces.feedback_rating),
      feedback_comment = CASE
        WHEN excluded.feedback_comment != '' THEN excluded.feedback_comment
        ELSE ai_traces.feedback_comment
      END,
      updated_at = excluded.updated_at`
  ).run(
    record.traceId,
    record.lang,
    record.userMessage,
    record.intent,
    record.status,
    record.provider,
    JSON.stringify(record.intake || {}),
    JSON.stringify(record.capacityPlan || {}),
    JSON.stringify(record.budgetResult || {}),
    JSON.stringify(record.purposeSelection || {}),
    JSON.stringify(record.evalResult || {}),
    Math.max(0, Math.round(record.latencyMs)),
    Math.max(0, Math.round(record.retryCount)),
    record.feedbackRating ?? null,
    (record.feedbackComment || "").trim(),
    createdAt,
    updatedAt
  );
}
async function getAiTraceById(traceId) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("ai_traces").select("*").eq("trace_id", traceId).maybeSingle();
    if (error) throw new Error(`Supabase getAiTraceById failed: ${error.message}`);
    return data ? mapRowToTraceRecord(data) : null;
  }
  const db = getDb();
  const row = db.prepare("SELECT * FROM ai_traces WHERE trace_id = ?").get(traceId);
  return row ? mapRowToTraceRecord(row) : null;
}
async function submitAiTraceFeedback(input) {
  const traceId = String(input.traceId || "").trim();
  if (!traceId) {
    throw new ServiceError(400, "VALIDATION_ERROR", "traceId l\xE0 b\u1EAFt bu\u1ED9c.");
  }
  if (input.rating !== 1 && input.rating !== -1) {
    throw new ServiceError(400, "VALIDATION_ERROR", "rating ph\u1EA3i l\xE0 1 ho\u1EB7c -1.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const comment = typeof input.comment === "string" ? input.comment.trim().slice(0, 1e3) : "";
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const existing2 = await getAiTraceById(traceId);
    if (!existing2) {
      throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y trace AI t\u01B0\u01A1ng \u1EE9ng.");
    }
    const { data, error } = await supabase.from("ai_traces").update({
      feedback_rating: input.rating,
      feedback_comment: comment,
      updated_at: now
    }).eq("trace_id", traceId).select("*").single();
    if (error || !data) {
      throw new Error(`Supabase submitAiTraceFeedback failed: ${error?.message || "Unknown error"}`);
    }
    return mapRowToTraceRecord(data);
  }
  const db = getDb();
  const existing = db.prepare("SELECT trace_id FROM ai_traces WHERE trace_id = ?").get(traceId);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y trace AI t\u01B0\u01A1ng \u1EE9ng.");
  }
  db.prepare(
    `UPDATE ai_traces
     SET feedback_rating = ?, feedback_comment = ?, updated_at = ?
     WHERE trace_id = ?`
  ).run(input.rating, comment, now, traceId);
  return await getAiTraceById(traceId);
}
async function listAiTraces(filters) {
  const limit = Math.max(1, Math.min(100, Number(filters?.limit) || 30));
  const offset = Math.max(0, Number(filters?.offset) || 0);
  const normalizedIntent = filters?.intent === "plan_trip" ? "update_itinerary" : filters?.intent;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("ai_traces").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (filters?.status === "needs_clarification" || filters?.status === "completed") {
      query = query.eq("status", filters.status);
    }
    if (normalizedIntent === "general_qa" || normalizedIntent === "update_itinerary" || normalizedIntent === "modify_stops") {
      query = query.eq("intent", normalizedIntent);
    }
    const { data, count, error } = await query;
    if (error) throw new Error(`Supabase listAiTraces failed: ${error.message}`);
    return {
      traces: (data || []).map(mapRowToTraceRecord),
      total: count ?? 0
    };
  }
  const db = getDb();
  const whereParts = ["1=1"];
  const params = [];
  if (filters?.status === "needs_clarification" || filters?.status === "completed") {
    whereParts.push("status = ?");
    params.push(filters.status);
  }
  if (normalizedIntent === "general_qa" || normalizedIntent === "update_itinerary" || normalizedIntent === "modify_stops") {
    whereParts.push("intent = ?");
    params.push(normalizedIntent);
  }
  const whereClause = whereParts.join(" AND ");
  const countRow = db.prepare(`SELECT COUNT(*) AS cnt FROM ai_traces WHERE ${whereClause}`).get(...params);
  const rows = db.prepare(
    `SELECT * FROM ai_traces
       WHERE ${whereClause}
       ORDER BY created_at DESC, rowid DESC
       LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  return {
    traces: rows.map(mapRowToTraceRecord),
    total: countRow.cnt
  };
}

// server/services/ai/workflow/langGraphAgent.ts
import crypto2 from "node:crypto";
import {
  EVALUATION_ANNOTATOR_KIND,
  EVALUATION_EXPLANATION,
  EVALUATION_LABEL,
  EVALUATION_NAME,
  EVALUATION_SCORE,
  LLM_MODEL_NAME as LLM_MODEL_NAME4,
  LLM_PROVIDER as LLM_PROVIDER4,
  LLM_SYSTEM as LLM_SYSTEM4,
  OpenInferenceSpanKind as OpenInferenceSpanKind8,
  TOOL_DESCRIPTION as TOOL_DESCRIPTION2,
  TOOL_NAME as TOOL_NAME2,
  TOOL_PARAMETERS as TOOL_PARAMETERS2
} from "@arizeai/openinference-semantic-conventions";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";

// src/utils/googleMaps.ts
var KNOWN_GEO_LOOKUP = [
  {
    keywords: ["th\u1EBF gi\u1EDBi c\xE0 ph\xEA", "world coffee museum"],
    coord: { lat: 12.69086, lng: 108.04471 },
    googleMapsQuery: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["l\xE0ng c\xE0 ph\xEA trung nguy\xEAn", "trung nguy\xEAn"],
    coord: { lat: 12.701056, lng: 108.061103 },
    googleMapsQuery: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn, 163 L\xFD Th\xE1i T\u1ED5, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["ako dh\xF4ng", "ak\xF4 \u0111h\xF4ng"],
    coord: { lat: 12.6964, lng: 108.0478 },
    googleMapsQuery: "Bu\xF4n Ak\xF4 \u0110h\xF4ng, Tr\u1EA7n Nh\u1EADt Du\u1EADt, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["b\u1EA3o t\xE0ng \u0111\u1EAFk l\u1EAFk"],
    coord: { lat: 12.6715, lng: 108.0535 },
    googleMapsQuery: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk, 12 L\xEA Du\u1EA9n, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["ea t\xE2n", "kr\xF4ng n\u0103ng", "c\u01B0 m\u2019gar", "c\u01B0 m'gar"],
    coord: { lat: 12.94694, lng: 108.36111 },
    googleMapsQuery: "X\xE3 Ea T\xE2n, Kr\xF4ng N\u0103ng, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["\u0111\xE1 voi m\u1EB9", "\u0111\xE1 voi"],
    coord: { lat: 12.48139, lng: 108.23306 },
    googleMapsQuery: "\u0110\xE1 Voi M\u1EB9, Yang Tao, L\u1EAFk, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["g\u1ED1m c\u1ED5", "l\xE0ng g\u1ED1m", "yang tao"],
    coord: { lat: 12.468, lng: 108.215 },
    googleMapsQuery: "L\xE0ng g\u1ED1m c\u1ED5 Yang Tao, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["bi\u1EC7t \u0111i\u1EC7n b\u1EA3o \u0111\u1EA1i"],
    coord: { lat: 12.426, lng: 108.176 },
    googleMapsQuery: "Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i H\u1ED3 L\u1EAFk, Li\xEAn S\u01A1n, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["bu\xF4n jun", "bu\xF4n l\xEA", "h\u1ED3 l\u1EAFk", "\u0111\u1ED9c m\u1ED9c"],
    coord: { lat: 12.42167, lng: 108.18194 },
    googleMapsQuery: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun, Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["dray nur", "ch\u1EA3o gang b\xEAn su\u1ED1i"],
    coord: { lat: 12.5028, lng: 107.925 },
    googleMapsQuery: "Th\xE1c Dray Nur, Dray S\xE1p, Kr\xF4ng Ana, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["gia long"],
    coord: { lat: 12.5139, lng: 107.8889 },
    googleMapsQuery: "Th\xE1c Gia Long, S\xF4ng S\xEAr\xEAp\u1ED1k, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["bu\xF4n ku\u1ED1p"],
    coord: { lat: 12.5417, lng: 107.9125 },
    googleMapsQuery: "Bu\xF4n Ku\u1ED1p, Dray S\xE1p, Kr\xF4ng Ana, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["yok \u0111\xF4n"],
    coord: { lat: 12.8038, lng: 107.6707 },
    googleMapsQuery: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n, Kr\xF4ng Na, Bu\xF4n \u0110\xF4n, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["c\u1EA7u treo", "b\u1EA3n \u0111\xF4n", "khunjunob", "s\xEAr\xEAp\u1ED1k"],
    coord: { lat: 12.875, lng: 107.817 },
    googleMapsQuery: "Trung t\xE2m du l\u1ECBch C\u1EA7u treo Bu\xF4n \u0110\xF4n, Kr\xF4ng Na, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["t\u01A1ng j\xFA", "ea kao"],
    coord: { lat: 12.608, lng: 108.055 },
    googleMapsQuery: "Bu\xF4n T\u01A1ng J\xFA, X\xE3 Ea Kao, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["phan \u0111\xECnh gi\xF3t", "b\xFAn ch\xECa", "b\xFAn \u0111\u1ECF", "rang m\u1ED9c"],
    coord: { lat: 12.6816, lng: 108.0398 },
    googleMapsQuery: "\u0110\u01B0\u1EDDng Phan \u0110\xECnh Gi\xF3t, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["tr\u1EA7n nh\u1EADt du\u1EADt", "b\xE1nh \u01B0\u1EDBt th\u1ECBt n\u01B0\u1EDBng"],
    coord: { lat: 12.6895, lng: 108.0462 },
    googleMapsQuery: "\u0110\u01B0\u1EDDng Tr\u1EA7n Nh\u1EADt Du\u1EADt, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["ng\xE3 s\xE1u", "kem b\u01A1"],
    coord: { lat: 12.6797, lng: 108.0445 },
    googleMapsQuery: "Ng\xE3 S\xE1u Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["s\xE2n bay", "bmv"],
    coord: { lat: 12.66806, lng: 108.12 },
    googleMapsQuery: "S\xE2n bay Bu\xF4n Ma Thu\u1ED9t, H\xF2a Th\u1EAFng, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["ch\u01B0 yang sin", "th\xE1c b\xECm b\u1ECBp"],
    coord: { lat: 12.455, lng: 108.375 },
    googleMapsQuery: "V\u01B0\u1EDDn Qu\u1ED1c gia Ch\u01B0 Yang Sin, Kr\xF4ng B\xF4ng, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["kpin ea", "b\u1EBFn n\u01B0\u1EDBc c\u1ED5"],
    coord: { lat: 12.686, lng: 108.062 },
    googleMapsQuery: "B\u1EBFn n\u01B0\u1EDBc c\u1ED5 Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["bu\xF4n ma thu\u1ED9t", "c\xE0 ph\xEA v\u1EE3t \u0111\xEAm", "c\xE1 l\u0103ng"],
    coord: { lat: 12.6788, lng: 108.0422 },
    googleMapsQuery: "Trung t\xE2m Th\xE0nh ph\u1ED1 Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  }
];
function projectLegacyCanvasToLatLng(x, y) {
  const clampedX = Math.max(0, Math.min(760, x || 380));
  const clampedY = Math.max(0, Math.min(400, y || 200));
  const lat = 13.02 - clampedY / 400 * 0.68;
  const lng = 107.55 + clampedX / 760 * 0.92;
  return {
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5
  };
}
function resolveGeoForStop(input) {
  const haystack = `${input.title || ""} ${input.location || ""}`.toLowerCase();
  const matched = KNOWN_GEO_LOOKUP.find(
    (entry) => entry.keywords.some((kw) => haystack.includes(kw))
  );
  const lat = typeof input.lat === "number" ? input.lat : matched ? matched.coord.lat : projectLegacyCanvasToLatLng(input.x ?? 380, input.y ?? 200).lat;
  const lng = typeof input.lng === "number" ? input.lng : matched ? matched.coord.lng : projectLegacyCanvasToLatLng(input.x ?? 380, input.y ?? 200).lng;
  const googleMapsQuery = input.googleMapsQuery || matched?.googleMapsQuery || [input.title, input.location, "\u0110\u1EAFk L\u1EAFk"].filter(Boolean).join(", ");
  return { lat, lng, googleMapsQuery };
}
function haversineDistanceKm(a, b) {
  const toRad = (deg) => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// src/utils/plannerHelpers.ts
function computeLegMetrics(a, b) {
  const geoA = resolveGeoForStop(a);
  const geoB = resolveGeoForStop(b);
  const straightKm = haversineDistanceKm(geoA, geoB);
  const dist = Math.max(1.2, Math.round(straightKm * 1.28 * 10) / 10);
  const mins = Math.max(5, Math.round(dist * 1.45 + 3));
  return { dist, mins };
}

// server/services/ai/aiEvaluator.ts
var NEGATED_ELEPHANT_PATTERNS = [
  /không\s+cưỡi\s+voi/gi,
  /khong\s+cuoi\s+voi/gi,
  /nói\s+không\s+với\s+(?:hoạt\s+động\s+)?cưỡi\s+voi/gi,
  /noi\s+khong\s+voi\s+(?:hoat\s+dong\s+)?cuoi\s+voi/gi,
  /thay\s+vì\s+cưỡi\s+voi/gi,
  /thay\s+vi\s+cuoi\s+voi/gi,
  /(?:cấm|cam|ngừng|ngung|dừng|dung|bỏ|bo|chấm\s+dứt|cham\s+dut|tránh|tranh|từ\s+chối|tu\s+choi)\s+(?:hoạt\s+động\s+|dịch\s+vụ\s+)?(?:cưỡi\s+voi|cuoi\s+voi)/gi,
  /no\s+elephant[- ]rid(?:e|ing)/gi,
  /non[- ]rid(?:e|ing)/gi,
  /without\s+(?:elephant\s+)?rid(?:e|ing)(?:\s+elephants?)?/gi,
  /never\s+ride\s+elephants?/gi,
  /(?:avoid|stop|ban|banned|ending|end|against|replace|instead\s+of|refuse)\s+(?:elephant[- ]rid(?:e|ing)|riding\s+elephants?)/gi
];
var POSITIVE_ELEPHANT_RIDING_REGEX = /(cưỡi\s+voi|cuoi\s+voi|elephant\s+rid(?:e|ing)|ride\s+(?:an?\s+)?elephant|elephant[- ]back)/i;
function hasElephantRidingViolation(text) {
  let scrubbed = String(text || "");
  for (const negPattern of NEGATED_ELEPHANT_PATTERNS) {
    scrubbed = scrubbed.replace(negPattern, " ");
  }
  return POSITIVE_ELEPHANT_RIDING_REGEX.test(scrubbed);
}
function sanitizeEthicalElephantText(text) {
  if (!hasElephantRidingViolation(text)) return text;
  const preserved = [];
  let updated = text;
  for (const negPattern of NEGATED_ELEPHANT_PATTERNS) {
    updated = updated.replace(negPattern, (match) => {
      const idx = preserved.length;
      preserved.push(match);
      return `__ETHICAL_ELEPHANT_SAFE_${idx}__`;
    });
  }
  updated = updated.replace(/cưỡi\s+voi/gi, "\u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn kh\xF4ng c\u01B0\u1EE1i voi");
  updated = updated.replace(/cuoi\s+voi/gi, "\u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn kh\xF4ng c\u01B0\u1EE1i voi");
  updated = updated.replace(
    /(elephant\s+rid(?:e|ing)|ride\s+(?:an?\s+)?elephant|elephant[- ]back)/gi,
    "ethical elephant observation"
  );
  preserved.forEach((orig, idx) => {
    updated = updated.replace(`__ETHICAL_ELEPHANT_SAFE_${idx}__`, orig);
  });
  return updated;
}
function computeDayDistanceKm(day) {
  if (!day.slots || day.slots.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < day.slots.length; i++) {
    const a = day.slots[i - 1];
    const b = day.slots[i];
    dist += computeLegMetrics(
      {
        title: a.title,
        location: a.location,
        x: a.x ?? 378,
        y: a.y ?? 196,
        lat: a.lat,
        lng: a.lng
      },
      {
        title: b.title,
        location: b.location,
        x: b.x ?? 378,
        y: b.y ?? 196,
        lat: b.lat,
        lng: b.lng
      }
    ).dist;
  }
  return Math.round(dist * 10) / 10;
}
function isCitationUrlValid(citation, budgetResult, purposeSelection, validPostSlugs, allowedExternalUrls) {
  const url = String(citation.url || "").trim();
  if (!url) return false;
  if (url.startsWith("/blog/")) {
    const slug = url.slice("/blog/".length).split(/[?#]/)[0].trim();
    if (!slug) return false;
    const allowedSlugs = /* @__PURE__ */ new Set([
      ...purposeSelection?.relevantPosts.map((p) => p.slug) || [],
      ...validPostSlugs || []
    ]);
    if (allowedSlugs.size > 0) {
      return allowedSlugs.has(slug);
    }
    return /^[a-z0-9-]+$/i.test(slug) && !/khong-ton-tai|hallucinated|fake/i.test(slug);
  }
  if (/^https?:\/\//i.test(url)) {
    if (/\.invalid(?=\/|$)/i.test(url)) return false;
    if (url.startsWith("https://www.google.com/maps/")) return true;
    const externalWhitelist = /* @__PURE__ */ new Set([
      ...budgetResult?.citations.map((c) => c.url.trim()) || [],
      ...(allowedExternalUrls || []).map((u) => u.trim())
    ]);
    if (externalWhitelist.size > 0 || budgetResult || purposeSelection) {
      return externalWhitelist.has(url);
    }
    return true;
  }
  return false;
}
function evaluatePhase5Output(input) {
  const { response, capacityPlan, budgetResult, purposeSelection, validPostSlugs } = input;
  const violations = [];
  const repairsApplied = [];
  const checks = [];
  const repairedResponse = {
    ...response,
    itineraryMeta: response.itineraryMeta ? {
      ...response.itineraryMeta,
      tips: [...response.itineraryMeta.tips]
    } : void 0,
    generatedDays: response.generatedDays ? response.generatedDays.map((d) => ({
      ...d,
      slots: d.slots.map((s) => ({ ...s }))
    })) : void 0,
    generatedExpenses: response.generatedExpenses ? response.generatedExpenses.map((e) => ({ ...e })) : void 0,
    citations: response.citations ? response.citations.map((c) => ({ ...c })) : void 0
  };
  const selectedMap = new Map(
    purposeSelection.selectedPlaces.map((p) => [p.title.trim().toLowerCase(), p])
  );
  const days = repairedResponse.generatedDays || [];
  const distanceLimitKm = capacityPlan.maxDailyDistanceKm || 120;
  const maxStopsPerDay = capacityPlan.maxStopsPerDay || 4;
  const ungroundedTitles = [];
  days.forEach((day) => {
    day.slots.forEach((slot) => {
      const key = String(slot.title || "").trim().toLowerCase();
      if (!selectedMap.has(key)) {
        ungroundedTitles.push(slot.title);
      }
    });
  });
  if (ungroundedTitles.length > 0) {
    violations.push(
      `Ungrounded stop(s) not in selectedPlaces: ${ungroundedTitles.join(", ")}`
    );
    checks.push({
      name: "grounding_selected_places",
      passed: false,
      details: `Found ${ungroundedTitles.length} ungrounded stop(s).`
    });
    const usedKeys = /* @__PURE__ */ new Set();
    for (const day of days) {
      day.slots = day.slots.filter((slot) => {
        const k = String(slot.title || "").trim().toLowerCase();
        if (selectedMap.has(k) && !usedKeys.has(k)) {
          usedKeys.add(k);
          return true;
        }
        return false;
      });
    }
    const unusedPlaces = purposeSelection.selectedPlaces.filter(
      (p) => !usedKeys.has(p.title.trim().toLowerCase())
    );
    for (const place of unusedPlaces) {
      const currentTotal = days.reduce((sum, d) => sum + d.slots.length, 0);
      if (currentTotal >= capacityPlan.maxStopsTotal || days.length === 0) break;
      const dir = dakLakPlaceDirectory.find(
        (d) => d.title.toLowerCase() === place.title.toLowerCase()
      );
      const candidateSlot = {
        time: dir?.time || "09:00 \u2013 11:00",
        period: dir?.period || "Bu\u1ED5i s\xE1ng",
        title: place.title,
        location: place.location,
        desc: dir?.desc || `Kh\xE1m ph\xE1 ${place.title}.`,
        isCustom: false,
        areaCluster: place.areaCluster,
        x: dir?.x,
        y: dir?.y,
        lat: dir?.lat,
        lng: dir?.lng,
        googleMapsQuery: dir?.googleMapsQuery,
        estimatedCostVnd: place.estimatedSpendVnd
      };
      const eligibleDays = days.filter((d) => d.slots.length < maxStopsPerDay).sort((a, b) => a.slots.length - b.slots.length);
      const candidates = eligibleDays.length > 0 ? eligibleDays : [...days].sort((a, b) => a.slots.length - b.slots.length);
      let chosenDay = candidates.find((d) => {
        const simulated = { ...d, slots: [...d.slots, candidateSlot] };
        return computeDayDistanceKm(simulated) <= distanceLimitKm;
      });
      if (!chosenDay && candidates[0]?.slots.length === 0) {
        chosenDay = candidates[0];
      }
      if (chosenDay) {
        chosenDay.slots.push(candidateSlot);
      }
    }
    repairsApplied.push(`Replaced/pruned ${ungroundedTitles.length} ungrounded stop(s).`);
  } else {
    checks.push({
      name: "grounding_selected_places",
      passed: true,
      details: "All itinerary stops are grounded in selectedPlaces."
    });
  }
  const initialTotalStops = (response.generatedDays || []).reduce(
    (sum, d) => sum + d.slots.length,
    0
  );
  if (initialTotalStops > capacityPlan.maxStopsTotal) {
    violations.push(
      `Total stops (${initialTotalStops}) exceeds maxStopsTotal (${capacityPlan.maxStopsTotal}).`
    );
    checks.push({
      name: "stop_cap",
      passed: false,
      details: `${initialTotalStops} > ${capacityPlan.maxStopsTotal}`
    });
  } else {
    checks.push({
      name: "stop_cap",
      passed: true,
      details: `${initialTotalStops} <= ${capacityPlan.maxStopsTotal}`
    });
  }
  let currentCount = days.reduce((sum, d) => sum + d.slots.length, 0);
  if (currentCount > capacityPlan.maxStopsTotal || initialTotalStops > capacityPlan.maxStopsTotal) {
    while (currentCount > capacityPlan.maxStopsTotal) {
      const heaviest = [...days].sort((a, b) => b.slots.length - a.slots.length)[0];
      if (!heaviest || heaviest.slots.length === 0) break;
      heaviest.slots.pop();
      currentCount -= 1;
    }
    repairsApplied.push(`Trimmed stops to maxStopsTotal=${capacityPlan.maxStopsTotal}.`);
  }
  const initialExpenseTotal = (response.generatedExpenses || []).reduce(
    (sum, item) => sum + Math.max(0, Number(item.amount) || 0),
    0
  );
  if (budgetResult.totalBudgetVnd > 0 && initialExpenseTotal > budgetResult.totalBudgetVnd) {
    violations.push(
      `Total expenses (${initialExpenseTotal.toLocaleString(
        "vi-VN"
      )} VND) exceed budget cap (${budgetResult.totalBudgetVnd.toLocaleString("vi-VN")} VND).`
    );
    checks.push({
      name: "budget_cap",
      passed: false,
      details: `${initialExpenseTotal} > ${budgetResult.totalBudgetVnd}`
    });
    if (repairedResponse.generatedExpenses && repairedResponse.generatedExpenses.length > 0) {
      const scale = budgetResult.totalBudgetVnd / initialExpenseTotal;
      let running = 0;
      const scaled = repairedResponse.generatedExpenses.map((e, idx, arr) => {
        if (idx === arr.length - 1) {
          return { ...e, amount: Math.max(0, budgetResult.totalBudgetVnd - running) };
        }
        const nextAmt = Math.max(0, Math.floor(e.amount * scale / 1e3) * 1e3);
        running += nextAmt;
        return { ...e, amount: nextAmt };
      });
      repairedResponse.generatedExpenses = scaled;
      repairsApplied.push(
        `Scaled generatedExpenses to stay within ${budgetResult.totalBudgetVnd.toLocaleString("vi-VN")} VND.`
      );
    }
  } else {
    checks.push({
      name: "budget_cap",
      passed: true,
      details: `${initialExpenseTotal} <= ${budgetResult.totalBudgetVnd}`
    });
  }
  const originalDays = response.generatedDays || [];
  const overDistanceDays = [];
  originalDays.forEach((day, idx) => {
    const km = computeDayDistanceKm(day);
    if (km > distanceLimitKm) {
      overDistanceDays.push(`${day.day || `Day ${idx + 1}`} (${km} km)`);
    }
  });
  if (overDistanceDays.length > 0) {
    violations.push(
      `Daily route distance exceeds ${distanceLimitKm} km: ${overDistanceDays.join(", ")}.`
    );
    checks.push({
      name: "daily_distance_limit",
      passed: false,
      details: overDistanceDays.join("; ")
    });
  } else {
    checks.push({
      name: "daily_distance_limit",
      passed: true,
      details: `All days <= ${distanceLimitKm} km.`
    });
  }
  let prunedDistanceStops = false;
  for (const day of days) {
    while (day.slots.length > 1 && computeDayDistanceKm(day) > distanceLimitKm) {
      day.slots.pop();
      prunedDistanceStops = true;
    }
  }
  if (overDistanceDays.length > 0 || prunedDistanceStops) {
    repairsApplied.push(`Pruned long-distance detour stops to keep each day <= ${distanceLimitKm} km.`);
  }
  const textCorpus = [
    response.reply,
    response.itineraryMeta?.title || "",
    response.itineraryMeta?.stayMove || "",
    response.itineraryMeta?.routeTip || "",
    ...response.itineraryMeta?.tips || [],
    ...originalDays.flatMap((d) => [
      d.title,
      ...d.slots.flatMap((s) => [s.title, s.desc])
    ])
  ];
  const hasElephantViolation = textCorpus.some((t) => hasElephantRidingViolation(t));
  if (hasElephantViolation) {
    violations.push("Policy violation: elephant riding recommended instead of ethical observation.");
    checks.push({
      name: "ethical_elephant_policy",
      passed: false,
      details: "Detected elephant-riding phrasing."
    });
    repairedResponse.reply = sanitizeEthicalElephantText(repairedResponse.reply);
    if (repairedResponse.itineraryMeta) {
      repairedResponse.itineraryMeta.title = sanitizeEthicalElephantText(
        repairedResponse.itineraryMeta.title
      );
      repairedResponse.itineraryMeta.routeTip = sanitizeEthicalElephantText(
        repairedResponse.itineraryMeta.routeTip
      );
      repairedResponse.itineraryMeta.tips = repairedResponse.itineraryMeta.tips.map(
        sanitizeEthicalElephantText
      );
    }
    for (const day of days) {
      day.title = sanitizeEthicalElephantText(day.title);
      day.slots.forEach((slot) => {
        slot.title = sanitizeEthicalElephantText(slot.title);
        slot.desc = sanitizeEthicalElephantText(slot.desc);
      });
    }
    repairsApplied.push("Replaced elephant-riding references with ethical non-riding observation.");
  } else {
    checks.push({
      name: "ethical_elephant_policy",
      passed: true,
      details: "Complies with ethical elephant observation policy."
    });
  }
  const rawCitations = response.citations || [];
  const invalidCitations = rawCitations.filter(
    (c) => !isCitationUrlValid(c, budgetResult, purposeSelection, validPostSlugs)
  );
  if (invalidCitations.length > 0) {
    violations.push(
      `Invalid or hallucinated citation URL(s): ${invalidCitations.map((c) => c.url).join(", ")}`
    );
    checks.push({
      name: "valid_citation_urls",
      passed: false,
      details: `${invalidCitations.length} invalid citation(s)`
    });
    repairedResponse.citations = rawCitations.filter(
      (c) => isCitationUrlValid(c, budgetResult, purposeSelection, validPostSlugs)
    );
    repairsApplied.push(`Removed ${invalidCitations.length} ungrounded/invalid citation(s).`);
  } else {
    checks.push({
      name: "valid_citation_urls",
      passed: true,
      details: `${rawCitations.length} verified citation(s).`
    });
  }
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round(passedCount / checks.length * 100);
  const passed = violations.length === 0;
  const needsRetry = ungroundedTitles.length > 1 || overDistanceDays.length > 0 || hasElephantViolation;
  return {
    evalResult: {
      passed,
      score,
      violations,
      repairsApplied,
      checks
    },
    repairedResponse,
    needsRetry
  };
}
function evaluateQaOutput(input) {
  const { response, tavilySnippets, tavilyCitations, validPostSlugs } = input;
  const violations = [];
  const repairsApplied = [];
  const checks = [];
  const repairedResponse = {
    ...response,
    stopOperations: response.stopOperations ? [...response.stopOperations] : [],
    citations: response.citations ? response.citations.map((c) => ({ ...c })) : void 0
  };
  const rawReply = String(response.reply || "").trim();
  if (rawReply.length < 5) {
    violations.push("Q&A reply is empty or too short.");
    checks.push({
      name: "non_empty_reply",
      passed: false,
      details: `Reply length=${rawReply.length}`
    });
  } else {
    checks.push({
      name: "non_empty_reply",
      passed: true,
      details: `Reply length=${rawReply.length}`
    });
  }
  const hasElephantViolation = hasElephantRidingViolation(rawReply);
  if (hasElephantViolation) {
    violations.push("Policy violation: elephant riding recommended in Q&A reply.");
    checks.push({
      name: "ethical_elephant_policy",
      passed: false,
      details: "Detected elephant-riding phrasing in Q&A reply."
    });
    repairedResponse.reply = sanitizeEthicalElephantText(repairedResponse.reply);
    repairsApplied.push("Replaced elephant-riding references in Q&A reply with ethical observation.");
  } else {
    checks.push({
      name: "ethical_elephant_policy",
      passed: true,
      details: "Complies with ethical elephant observation policy."
    });
  }
  const mutatedItinerary = response.intent === "general_qa" && (Boolean(response.resetItineraryToTheme) || Boolean(response.shouldOpenPlanner) || Boolean(response.generatedDays && response.generatedDays.length > 0) || Boolean(response.stopOperations && response.stopOperations.length > 0));
  if (mutatedItinerary) {
    violations.push("general_qa response attempted to mutate or reset active itinerary.");
    checks.push({
      name: "no_unintended_itinerary_mutation",
      passed: false,
      details: "Detected planner mutation flags on general_qa response."
    });
    repairedResponse.resetItineraryToTheme = false;
    repairedResponse.shouldOpenPlanner = false;
    repairedResponse.generatedDays = void 0;
    repairedResponse.stopOperations = [];
    repairsApplied.push("Cleared itinerary mutation fields on general_qa response.");
  } else {
    checks.push({
      name: "no_unintended_itinerary_mutation",
      passed: true,
      details: "No unintended itinerary mutation."
    });
  }
  const allowedExternalUrls = [
    ...(tavilySnippets || []).map((s) => String(s.url || "").trim()).filter(Boolean),
    ...(tavilyCitations || []).map((c) => String(c.url || "").trim()).filter(Boolean)
  ];
  const rawCitations = response.citations || [];
  const invalidCitations = rawCitations.filter(
    (c) => !isCitationUrlValid(
      c,
      void 0,
      void 0,
      validPostSlugs,
      allowedExternalUrls.length > 0 ? allowedExternalUrls : void 0
    )
  );
  if (invalidCitations.length > 0) {
    violations.push(
      `Invalid or hallucinated Q&A citation URL(s): ${invalidCitations.map((c) => c.url).join(", ")}`
    );
    checks.push({
      name: "valid_citation_urls",
      passed: false,
      details: `${invalidCitations.length} invalid citation(s)`
    });
    repairedResponse.citations = rawCitations.filter(
      (c) => isCitationUrlValid(
        c,
        void 0,
        void 0,
        validPostSlugs,
        allowedExternalUrls.length > 0 ? allowedExternalUrls : void 0
      )
    );
    repairsApplied.push(`Removed ${invalidCitations.length} invalid Q&A citation(s).`);
  } else {
    checks.push({
      name: "valid_citation_urls",
      passed: true,
      details: `${rawCitations.length} verified citation(s).`
    });
  }
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round(passedCount / checks.length * 100);
  const passed = violations.length === 0;
  const needsRetry = rawReply.length < 5 || hasElephantViolation;
  return {
    evalResult: {
      passed,
      score,
      violations,
      repairsApplied,
      checks
    },
    repairedResponse,
    needsRetry
  };
}

// server/services/ai/tavilyService.ts
import { tavily } from "@tavily/core";
import {
  OpenInferenceSpanKind as OpenInferenceSpanKind2,
  TOOL_DESCRIPTION,
  TOOL_NAME,
  TOOL_PARAMETERS
} from "@arizeai/openinference-semantic-conventions";
var QA_CACHE_TTL_MS = 15 * 60 * 1e3;
var QA_CACHE_MAX_ENTRIES = 100;
var tavilyQaCache = /* @__PURE__ */ new Map();
var warnedMissingTavilyKey = false;
function foldVietnameseSearchText(input) {
  return String(input || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
function buildTavilyQaQuery(rawQuery) {
  const cleaned = String(rawQuery || "").trim();
  if (!cleaned) return "";
  const folded = foldVietnameseSearchText(cleaned);
  const hasProvinceOrCityAnchor = /(dak\s*lak|daklak|buon\s*ma\s*thuot|\bbmt\b|ban\s*me|tay\s*nguyen)/.test(folded);
  if (hasProvinceOrCityAnchor) {
    return cleaned;
  }
  const hasSubLocationAnchor = /(ho\s*lak|buon\s*jun|buon\s*le|buon\s*don|ban\s*don|dray\s*nur|dray\s*sap|yok\s*don|ea\s*kao|chu\s*yang\s*sin|kotam|ko\s*tam|tong\s*ju|ako\s*dhong|bao\s*tang\s*the\s*gioi\s*ca\s*phe|chu\s*dang\s*ya)/.test(
    folded
  );
  return hasSubLocationAnchor ? `${cleaned} \u0110\u1EAFk L\u1EAFk` : `${cleaned} \u0110\u1EAFk L\u1EAFk Bu\xF4n Ma Thu\u1ED9t`;
}
function extractVndPricesFromText(text) {
  const cleaned = String(text || "").replace(/\u00a0/g, " ");
  const amounts = [];
  const rangeRegex = /(\d{1,3}(?:[.,]\d{3})+|\d{4,8})\s*[-–~]\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,8})\s*(?:đồng|vnđ|vnd|đ|d)(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(rangeRegex)) {
    for (const group of [match[1], match[2]]) {
      const val = Number(group.replace(/[.,\s]/g, ""));
      if (Number.isFinite(val) && val >= 1e4 && val <= 1e7) {
        amounts.push(Math.round(val));
      }
    }
  }
  const fullNumberRegex = /(\d{1,3}(?:[.,\s]\d{3})+|\d{4,8})\s*(?:đồng|vnđ|vnd|đ|d)(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(fullNumberRegex)) {
    const rawNum = match[1].replace(/[.,\s]/g, "");
    const val = Number(rawNum);
    if (Number.isFinite(val) && val >= 1e4 && val <= 1e7) {
      amounts.push(Math.round(val));
    }
  }
  const kNumberRegex = /(\d{2,4})\s*k(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(kNumberRegex)) {
    const val = Number(match[1]) * 1e3;
    if (Number.isFinite(val) && val >= 1e4 && val <= 1e7) {
      amounts.push(Math.round(val));
    }
  }
  const millionRegex = /(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|million)(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(millionRegex)) {
    const normalized = match[1].replace(",", ".");
    const val = Number(normalized) * 1e6;
    if (Number.isFinite(val) && val >= 1e5 && val <= 2e7) {
      amounts.push(Math.round(val));
    }
  }
  const uniqueSorted = Array.from(new Set(amounts)).sort((a, b) => a - b);
  const mentionsFree = /(?:^|[^\p{L}\p{N}_])(miễn phí|free entry|free admission|không mất vé)(?=$|[^\p{L}\p{N}_])/iu.test(
    cleaned
  );
  const mentionsExplicitFreeAdmission = /(miễn\s*phí\s*(?:vé|vào\s*cổng|tham\s*quan)|vé\s*(?:vào\s*cổng\s*)?miễn\s*phí|free\s+entry|free\s+admission|không\s+mất\s+vé)/iu.test(
    cleaned
  );
  const mentionsPaidTicketClause = /(?:giá\s*vé|vé\s*(?:vào\s*cổng|tham\s*quan|người\s*lớn|lẻ))\s*(?:là|:|khoảng|~)?\s*\d/iu.test(
    cleaned
  );
  if (uniqueSorted.length === 0) {
    return {
      amounts: [],
      ticketVnd: mentionsFree ? 0 : null,
      estimatedSpendVnd: null
    };
  }
  const isFreeAdmission = mentionsExplicitFreeAdmission && !mentionsPaidTicketClause;
  const ticketVnd = isFreeAdmission ? 0 : uniqueSorted[0];
  const estimatedSpendVnd = uniqueSorted.length > 1 ? uniqueSorted[Math.min(1, uniqueSorted.length - 1)] : uniqueSorted[0];
  return {
    amounts: uniqueSorted,
    ticketVnd,
    estimatedSpendVnd
  };
}
async function verifyTavilyPriceWithDecisionGate(placeTitle, snippets, extractedTicketVnd, fetchFn = fetch) {
  const decisionModel = GEMINI_DECISION_MODEL.trim();
  const apiKey = GEMINI_API_KEY.trim();
  if (!decisionModel || !apiKey || snippets.length === 0) {
    return {
      verified: true,
      reason: "deterministic-snippet-parsing",
      usedDecisionApi: false
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5e3);
  try {
    const inputSummary = [
      `Target place: ${placeTitle} (Dak Lak, Vietnam)`,
      `Parsed ticket VND: ${extractedTicketVnd ?? "none"}`,
      ...snippets.slice(0, 3).map((s, idx) => `[${idx + 1}] ${s.title} (${s.url}): ${s.content.slice(0, 400)}`)
    ].join("\n");
    const response = await fetchFn("https://generativelanguage.googleapis.com/v1beta/decisions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: decisionModel,
        input: inputSummary,
        questions: {
          is_relevant_place: {
            type: "noul",
            instructions: `Do the search snippets specifically describe "${placeTitle}" in Dak Lak, Vietnam?`
          },
          is_plausible_price: {
            type: "noul",
            instructions: "Is the parsed VND ticket/activity price plausible and consistent with the snippets (not an unrelated tour package or spam)?"
          }
        }
      })
    });
    if (!response.ok) {
      return {
        verified: true,
        reason: `decisions-api-http-${response.status}-fallback`,
        usedDecisionApi: false
      };
    }
    const data = await response.json();
    const relScore = data.answers?.is_relevant_place?.noul;
    const priceScore = data.answers?.is_plausible_price?.noul;
    if (typeof relScore === "number" && typeof priceScore === "number") {
      const verified = relScore >= 0.5 && priceScore >= 0.5;
      return {
        verified,
        reason: `gemini-decisions(rel=${relScore.toFixed(2)},price=${priceScore.toFixed(2)})`,
        usedDecisionApi: true
      };
    }
    return {
      verified: true,
      reason: "decisions-api-malformed-fallback",
      usedDecisionApi: false
    };
  } catch {
    return {
      verified: true,
      reason: "decisions-api-error-fallback",
      usedDecisionApi: false
    };
  } finally {
    clearTimeout(timer);
  }
}
async function searchPlacePriceWithTavily(placeTitle, areaCluster, options) {
  const apiKey = getTavilyApiKey();
  if (!apiKey && !options?.tavilyClient) {
    return null;
  }
  const query = `gi\xE1 v\xE9 tham quan ${placeTitle} ${areaCluster} \u0110\u1EAFk L\u1EAFk m\u1EDBi nh\u1EA5t VND`;
  const toolParamsSchema = JSON.stringify({
    type: "object",
    properties: {
      query: { type: "string" },
      placeTitle: { type: "string" },
      areaCluster: { type: "string" }
    },
    required: ["query", "placeTitle"]
  });
  return withOpenInferenceSpan(
    "tavily_search",
    {
      kind: OpenInferenceSpanKind2.TOOL,
      input: { query, placeTitle, areaCluster },
      attributes: {
        [TOOL_NAME]: "tavily_search",
        [TOOL_DESCRIPTION]: "Search real-time attraction ticket prices and local travel expenses in Dak Lak via Tavily.",
        [TOOL_PARAMETERS]: toolParamsSchema
      },
      formatOutput: (res) => res ? {
        placeTitle: res.placeTitle,
        ticketVnd: res.ticketVnd,
        estimatedSpendVnd: res.estimatedSpendVnd,
        sourceUrl: res.sourceUrl,
        verified: res.verified
      } : { result: null }
    },
    async () => {
      let timer;
      try {
        const client = options?.tavilyClient || tavily({ apiKey });
        const timeoutMs = options?.timeoutMs ?? TAVILY_TIMEOUT_MS;
        const TIMEOUT_SENTINEL = /* @__PURE__ */ Symbol("tavily_price_timeout");
        const timeoutPromise = new Promise((resolve) => {
          timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
        });
        const searchParams = {
          searchDepth: TAVILY_SEARCH_DEPTH,
          maxResults: 4,
          includeAnswer: TAVILY_INCLUDE_ANSWER,
          ...TAVILY_COUNTRY ? { country: TAVILY_COUNTRY } : {},
          timeout: Math.max(2, Math.ceil(timeoutMs / 1e3))
        };
        const response = await Promise.race([
          client.search(query, searchParams),
          timeoutPromise
        ]);
        if (response === TIMEOUT_SENTINEL || !response) {
          if (response === TIMEOUT_SENTINEL) {
            console.warn(`[Tavily Service] Price lookup timed out after ${timeoutMs}ms for "${placeTitle}".`);
          }
          return null;
        }
        const results = Array.isArray(response?.results) ? response.results : [];
        const snippets = results.filter((r) => typeof r?.url === "string" && r.url.startsWith("http")).map((r) => ({
          title: String(r.title || placeTitle).trim(),
          url: String(r.url).trim(),
          content: String(r.content || "").trim()
        }));
        const combinedText = [
          typeof response?.answer === "string" ? response.answer : "",
          ...snippets.map((s) => `${s.title} ${s.content}`)
        ].filter(Boolean).join("\n");
        if (!combinedText.trim() && snippets.length === 0) {
          return null;
        }
        const parsed = extractVndPricesFromText(combinedText);
        const gate = await withOpenInferenceSpan(
          "gemini_decisions_price_gate",
          {
            kind: OpenInferenceSpanKind2.GUARDRAIL,
            input: { placeTitle, parsedTicketVnd: parsed.ticketVnd, snippetCount: snippets.length }
          },
          () => verifyTavilyPriceWithDecisionGate(
            placeTitle,
            snippets,
            parsed.ticketVnd,
            options?.fetchFn
          )
        );
        if (!gate.verified) {
          return null;
        }
        const fallbackTicket = options?.fallbackTicketVnd ?? 0;
        const fallbackSpend = options?.fallbackEstimatedSpendVnd ?? Math.max(fallbackTicket, 1e5);
        const ticketVnd = parsed.ticketVnd !== null ? parsed.ticketVnd : fallbackTicket;
        const estimatedSpendVnd = parsed.estimatedSpendVnd !== null ? Math.max(ticketVnd, parsed.estimatedSpendVnd) : Math.max(ticketVnd, fallbackSpend);
        const primarySnippet = snippets[0];
        const citations = snippets.slice(0, 2).map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.content.slice(0, 180),
          source: "tavily"
        }));
        return {
          placeTitle,
          ticketVnd,
          estimatedSpendVnd,
          priceNote: parsed.ticketVnd !== null ? `C\u1EADp nh\u1EADt t\u1EEB Tavily (${gate.reason})` : `Tham chi\u1EBFu Tavily kh\xF4ng c\xF3 v\xE9 c\u1EE5 th\u1EC3, gi\u1EEF m\u1EE9c \u01B0\u1EDBc t\xEDnh (${gate.reason})`,
          sourceUrl: primarySnippet?.url || "",
          citations,
          verified: gate.verified,
          usedDecisionApi: gate.usedDecisionApi
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown Tavily error";
        console.warn(`[Tavily Service] Lookup failed for "${placeTitle}":`, msg);
        return null;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  );
}
async function searchGeneralQaWithTavily(queryText, options) {
  const searchQuery = buildTavilyQaQuery(queryText);
  if (options?.enableTavily === false) {
    return {
      query: searchQuery,
      snippets: [],
      citations: [],
      status: "disabled"
    };
  }
  if (!searchQuery) {
    return {
      query: "",
      snippets: [],
      citations: [],
      status: "empty_query"
    };
  }
  const apiKey = getTavilyApiKey();
  if (!apiKey && !options?.tavilyClient) {
    if (!warnedMissingTavilyKey) {
      warnedMissingTavilyKey = true;
      console.warn(
        "[Tavily Service] TAVILY_API_KEY is empty \u2014 live web search skipped (set TAVILY_API_KEY in .env or .env.local)."
      );
    }
    return {
      query: searchQuery,
      snippets: [],
      citations: [],
      status: "missing_api_key",
      error: "TAVILY_API_KEY is not configured"
    };
  }
  const cacheKey = searchQuery.toLowerCase();
  const useCache = !options?.tavilyClient && !options?.bypassCache;
  if (useCache) {
    const cached = tavilyQaCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data, fromCache: true };
    }
    if (cached) {
      tavilyQaCache.delete(cacheKey);
    }
  }
  const timeoutMs = options?.timeoutMs ?? TAVILY_TIMEOUT_MS;
  const maxResults = options?.maxResults ?? TAVILY_MAX_RESULTS;
  const searchOptions = {
    searchDepth: TAVILY_SEARCH_DEPTH,
    maxResults,
    includeAnswer: TAVILY_INCLUDE_ANSWER,
    ...TAVILY_COUNTRY ? { country: TAVILY_COUNTRY } : {},
    timeout: Math.max(2, Math.ceil(timeoutMs / 1e3))
  };
  const toolParamsSchema = JSON.stringify({
    type: "object",
    properties: {
      query: { type: "string" },
      searchDepth: { type: "string" },
      includeAnswer: { type: ["boolean", "string"] },
      maxResults: { type: "number" },
      country: { type: "string" },
      timeoutMs: { type: "number" }
    },
    required: ["query"]
  });
  return withOpenInferenceSpan(
    "tavily_qa_search",
    {
      kind: OpenInferenceSpanKind2.TOOL,
      input: {
        query: searchQuery,
        rawQuery: queryText,
        ...searchOptions,
        timeoutMs
      },
      attributes: {
        [TOOL_NAME]: "tavily_qa_search",
        [TOOL_DESCRIPTION]: "Search live web knowledge and external information for Dak Lak travel Q&A via Tavily.",
        [TOOL_PARAMETERS]: toolParamsSchema
      },
      formatOutput: (res) => ({
        query: res.query,
        status: res.status || "ok",
        ...res.error ? { error: res.error } : {},
        hasAnswer: Boolean(res.answer),
        snippetCount: res.snippets.length,
        citationUrls: res.citations.map((c) => c.url)
      })
    },
    async () => {
      let timer;
      try {
        const client = options?.tavilyClient || tavily({ apiKey });
        const TIMEOUT_SENTINEL = /* @__PURE__ */ Symbol("tavily_qa_timeout");
        const timeoutPromise = new Promise((resolve) => {
          timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
        });
        const response = await Promise.race([
          client.search(searchQuery, searchOptions),
          timeoutPromise
        ]);
        if (response === TIMEOUT_SENTINEL) {
          console.warn(`[Tavily Service] Q&A search timed out after ${timeoutMs}ms for "${searchQuery}".`);
          return {
            query: searchQuery,
            snippets: [],
            citations: [],
            status: "timeout",
            error: `Tavily request timed out after ${timeoutMs}ms`
          };
        }
        if (!response) {
          return {
            query: searchQuery,
            snippets: [],
            citations: [],
            status: "no_results"
          };
        }
        const answer = typeof response.answer === "string" && response.answer.trim() ? response.answer.trim() : void 0;
        const rawResults = Array.isArray(response.results) ? response.results : [];
        const snippets = rawResults.filter((r) => typeof r?.url === "string" && r.url.startsWith("http")).slice(0, maxResults).map((r) => ({
          title: String(r.title || "Tavily Reference").trim(),
          url: String(r.url).trim(),
          content: String(r.content || "").trim().slice(0, 500)
        }));
        const citations = snippets.slice(0, 3).map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.content.slice(0, 180),
          source: "tavily"
        }));
        const status = answer || snippets.length > 0 ? "ok" : "no_results";
        const lookupResult = {
          query: searchQuery,
          ...answer ? { answer } : {},
          snippets,
          citations,
          status
        };
        if (useCache && (answer || snippets.length > 0)) {
          if (tavilyQaCache.size >= QA_CACHE_MAX_ENTRIES) {
            const oldestKey = tavilyQaCache.keys().next().value;
            if (oldestKey) tavilyQaCache.delete(oldestKey);
          }
          tavilyQaCache.set(cacheKey, {
            expiresAt: Date.now() + QA_CACHE_TTL_MS,
            data: lookupResult
          });
        }
        return lookupResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown Tavily Q&A error";
        console.warn(`[Tavily Service] Q&A search failed for "${searchQuery}":`, msg);
        return {
          query: searchQuery,
          snippets: [],
          citations: [],
          status: "api_error",
          error: msg
        };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  );
}

// server/services/ai/workflow/followUpRouter.ts
import {
  LLM_MODEL_NAME as LLM_MODEL_NAME2,
  LLM_PROVIDER as LLM_PROVIDER2,
  LLM_SYSTEM as LLM_SYSTEM2,
  LLM_TOKEN_COUNT_COMPLETION as LLM_TOKEN_COUNT_COMPLETION2,
  LLM_TOKEN_COUNT_PROMPT as LLM_TOKEN_COUNT_PROMPT2,
  LLM_TOKEN_COUNT_TOTAL as LLM_TOKEN_COUNT_TOTAL2,
  OpenInferenceSpanKind as OpenInferenceSpanKind4,
  SemanticConventions as SemanticConventions3
} from "@arizeai/openinference-semantic-conventions";

// server/services/ai/plannerDataService.ts
var PLACE_PLANNER_METADATA = {
  "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA": {
    areaCluster: "BMT",
    themeTags: ["coffee", "culture"],
    defaultTicketVnd: 15e4,
    defaultEstimatedSpendVnd: 22e4
  },
  "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn": {
    areaCluster: "BMT",
    themeTags: ["coffee", "cuisine"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 12e4
  },
  "Bu\xF4n c\u1ED5 Ako Dh\xF4ng": {
    areaCluster: "BMT",
    themeTags: ["culture", "coffee", "cuisine"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 1e5
  },
  "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk": {
    areaCluster: "BMT",
    themeTags: ["culture"],
    defaultTicketVnd: 3e4,
    defaultEstimatedSpendVnd: 5e4
  },
  "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n": {
    areaCluster: "Kr\xF4ng N\u0103ng",
    themeTags: ["coffee", "nature"],
    defaultTicketVnd: 12e4,
    defaultEstimatedSpendVnd: 25e4
  },
  "\u0110\xE1 Voi M\u1EB9 Yang Tao": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    themeTags: ["nature", "culture"],
    defaultTicketVnd: 2e4,
    defaultEstimatedSpendVnd: 4e4
  },
  "H\u1ED3 L\u1EAFk & Bu\xF4n Jun": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    themeTags: ["nature", "culture", "coffee"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 22e4
  },
  "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    themeTags: ["culture", "coffee"],
    defaultTicketVnd: 3e4,
    defaultEstimatedSpendVnd: 6e4
  },
  "Th\xE1c Dray Nur H\xF9ng V\u0129": {
    areaCluster: "Dray Nur",
    themeTags: ["nature"],
    defaultTicketVnd: 4e4,
    defaultEstimatedSpendVnd: 1e5
  },
  "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n": {
    areaCluster: "Bu\xF4n \u0110\xF4n",
    themeTags: ["nature"],
    defaultTicketVnd: 6e4,
    defaultEstimatedSpendVnd: 85e4
  },
  "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA": {
    areaCluster: "Ea Kao",
    themeTags: ["culture"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 15e4
  },
  "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t": {
    areaCluster: "BMT",
    themeTags: ["cuisine", "coffee"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 15e4
  },
  "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n": {
    areaCluster: "Bu\xF4n \u0110\xF4n",
    themeTags: ["culture", "nature", "cuisine"],
    defaultTicketVnd: 5e4,
    defaultEstimatedSpendVnd: 18e4
  }
};
function safeJsonArray(raw, fallback) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "string") return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
function inferPlaceMetadata(place) {
  const known = PLACE_PLANNER_METADATA[place.title];
  if (known) return known;
  const hay = `${place.title} ${place.location} ${place.category}`.toLowerCase();
  let areaCluster = "BMT";
  if (hay.includes("h\u1ED3 l\u1EAFk") || hay.includes("yang tao") || hay.includes("li\xEAn s\u01A1n")) {
    areaCluster = "H\u1ED3 L\u1EAFk";
  } else if (hay.includes("dray nur") || hay.includes("kr\xF4ng ana")) {
    areaCluster = "Dray Nur";
  } else if (hay.includes("yok \u0111\xF4n") || hay.includes("b\u1EA3n \u0111\xF4n") || hay.includes("bu\xF4n \u0111\xF4n")) {
    areaCluster = "Bu\xF4n \u0110\xF4n";
  } else if (hay.includes("kr\xF4ng n\u0103ng") || hay.includes("ea t\xE2n")) {
    areaCluster = "Kr\xF4ng N\u0103ng";
  } else if (hay.includes("ea kao") || hay.includes("t\u01A1ng j\xFA")) {
    areaCluster = "Ea Kao";
  }
  const themeTags = [];
  if (hay.includes("c\xE0 ph\xEA") || hay.includes("coffee")) themeTags.push("coffee");
  if (hay.includes("v\u0103n h\xF3a") || hay.includes("b\u1EA3o t\xE0ng") || hay.includes("bu\xF4n") || hay.includes("th\u1ED5 c\u1EA9m")) {
    themeTags.push("culture");
  }
  if (hay.includes("th\xE1c") || hay.includes("v\u01B0\u1EDDn qu\u1ED1c gia") || hay.includes("h\u1ED3") || hay.includes("\u0111\xE1 voi")) {
    themeTags.push("nature");
  }
  if (hay.includes("\u1EA9m th\u1EF1c") || hay.includes("ph\u1ED1")) themeTags.push("cuisine");
  if (themeTags.length === 0) themeTags.push("culture");
  return {
    areaCluster,
    themeTags,
    defaultTicketVnd: 3e4,
    defaultEstimatedSpendVnd: 12e4
  };
}
async function listActiveStays(filters) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("stays").select("*").eq("is_active", true).order("nightly_rate_vnd", { ascending: true }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase listActiveStays failed: ${error.message}`);
    rows = data || [];
  } else {
    const db = getDb();
    rows = db.prepare("SELECT * FROM stays WHERE is_active = 1 ORDER BY nightly_rate_vnd ASC, id ASC").all();
  }
  let records = rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    area: row.area,
    tier: row.tier,
    nightlyRateVnd: row.nightly_rate_vnd,
    capacityMin: row.capacity_min,
    capacityMax: row.capacity_max,
    suitableFor: safeJsonArray(row.suitable_for_json, []),
    amenities: safeJsonArray(row.amenities_json, []),
    isActive: row.is_active === true || row.is_active === 1,
    sourceNote: row.source_note || void 0,
    updatedAt: row.updated_at
  }));
  if (filters?.tier) {
    records = records.filter((r) => r.tier === filters.tier);
  }
  if (filters?.area) {
    const areaLower = filters.area.toLowerCase();
    records = records.filter((r) => r.area.toLowerCase().includes(areaLower));
  }
  let exceedsSingleUnitCapacity = false;
  if (typeof filters?.travelersCount === "number" && filters.travelersCount > 0) {
    const count = filters.travelersCount;
    const capacityMatched = records.filter(
      (r) => count >= r.capacityMin && count <= r.capacityMax
    );
    if (capacityMatched.length > 0) {
      records = capacityMatched;
    } else {
      exceedsSingleUnitCapacity = true;
    }
  }
  if (filters?.companionType || exceedsSingleUnitCapacity) {
    const comp = filters?.companionType;
    records.sort((a, b) => {
      if (comp) {
        const aFit = a.suitableFor.includes(comp) ? 1 : 0;
        const bFit = b.suitableFor.includes(comp) ? 1 : 0;
        if (bFit !== aFit) return bFit - aFit;
      }
      if (exceedsSingleUnitCapacity && b.capacityMax !== a.capacityMax) {
        return b.capacityMax - a.capacityMax;
      }
      return a.nightlyRateVnd - b.nightlyRateVnd;
    });
  }
  return records;
}
async function listActiveLogistics(filters) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("logistics").select("*").eq("is_active", true).order("daily_rate_vnd", { ascending: true }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase listActiveLogistics failed: ${error.message}`);
    rows = data || [];
  } else {
    const db = getDb();
    rows = db.prepare("SELECT * FROM logistics WHERE is_active = 1 ORDER BY daily_rate_vnd ASC, id ASC").all();
  }
  let records = rows.map((row) => ({
    id: Number(row.id),
    mode: row.mode,
    label: row.label,
    tier: row.tier,
    dailyRateVnd: row.daily_rate_vnd,
    capacityMin: row.capacity_min,
    capacityMax: row.capacity_max,
    suitableFor: safeJsonArray(row.suitable_for_json, []),
    notes: row.notes || "",
    isActive: row.is_active === true || row.is_active === 1,
    updatedAt: row.updated_at
  }));
  if (filters?.tier) {
    records = records.filter((r) => r.tier === filters.tier);
  }
  let exceedsSingleVehicleCapacity = false;
  if (typeof filters?.travelersCount === "number" && filters.travelersCount > 0) {
    const count = filters.travelersCount;
    const capacityMatched = records.filter(
      (r) => count >= r.capacityMin && count <= r.capacityMax
    );
    if (capacityMatched.length > 0) {
      records = capacityMatched;
    } else {
      exceedsSingleVehicleCapacity = true;
      if (count > 2) {
        const largerVehicles = records.filter((r) => r.capacityMax > 2);
        if (largerVehicles.length > 0) {
          records = largerVehicles;
        }
      }
    }
  }
  if (filters?.companionType || exceedsSingleVehicleCapacity) {
    const comp = filters?.companionType;
    records.sort((a, b) => {
      if (exceedsSingleVehicleCapacity && b.capacityMax !== a.capacityMax) {
        return b.capacityMax - a.capacityMax;
      }
      if (comp) {
        const aFit = a.suitableFor.includes(comp) ? 1 : 0;
        const bFit = b.suitableFor.includes(comp) ? 1 : 0;
        if (bFit !== aFit) return bFit - aFit;
      }
      return a.dailyRateVnd - b.dailyRateVnd;
    });
  }
  return records;
}
async function upsertPlacePrice(input) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const fetchedAt = input.fetchedAt || now;
  const ticketVnd = Math.max(0, Math.round(input.ticketVnd));
  const estimatedSpendVnd = Math.max(ticketVnd, Math.round(input.estimatedSpendVnd));
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("place_prices").upsert(
      {
        place_title: input.placeTitle.trim(),
        area_cluster: input.areaCluster.trim(),
        ticket_vnd: ticketVnd,
        estimated_spend_vnd: estimatedSpendVnd,
        price_source: input.priceSource,
        price_note: (input.priceNote || "").trim(),
        source_url: (input.sourceUrl || "").trim(),
        fetched_at: fetchedAt,
        updated_at: now
      },
      { onConflict: "place_title" }
    );
    if (error) throw new Error(`Supabase upsertPlacePrice failed: ${error.message}`);
    return;
  }
  const db = getDb();
  db.prepare(
    `INSERT INTO place_prices (
      place_title, area_cluster, ticket_vnd, estimated_spend_vnd,
      price_source, price_note, source_url, fetched_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(place_title) DO UPDATE SET
      area_cluster = excluded.area_cluster,
      ticket_vnd = excluded.ticket_vnd,
      estimated_spend_vnd = excluded.estimated_spend_vnd,
      price_source = excluded.price_source,
      price_note = excluded.price_note,
      source_url = excluded.source_url,
      fetched_at = excluded.fetched_at,
      updated_at = excluded.updated_at`
  ).run(
    input.placeTitle.trim(),
    input.areaCluster.trim(),
    ticketVnd,
    estimatedSpendVnd,
    input.priceSource,
    (input.priceNote || "").trim(),
    (input.sourceUrl || "").trim(),
    fetchedAt,
    now
  );
}
function isPriceTimestampStale(fetchedAt, ttlHours = AI_PRICE_TTL_HOURS, nowMs = Date.now()) {
  if (!fetchedAt) return true;
  const parsed = Date.parse(fetchedAt);
  if (!Number.isFinite(parsed)) return true;
  const ageMs = nowMs - parsed;
  return ageMs > ttlHours * 60 * 60 * 1e3;
}
async function listEnrichedPlaces(ttlHours = AI_PRICE_TTL_HOURS, nowMs = Date.now()) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("place_prices").select("*");
    if (error) throw new Error(`Supabase listEnrichedPlaces failed: ${error.message}`);
    rows = data || [];
  } else {
    const db = getDb();
    rows = db.prepare("SELECT * FROM place_prices").all();
  }
  const byTitle = /* @__PURE__ */ new Map();
  for (const row of rows) {
    byTitle.set(row.place_title.trim().toLowerCase(), row);
  }
  return dakLakPlaceDirectory.map((place) => {
    const plannerMeta = inferPlaceMetadata(place);
    const cached = byTitle.get(place.title.trim().toLowerCase());
    const fetchedAt = cached?.fetched_at || "";
    const isStale = !cached || isPriceTimestampStale(fetchedAt, ttlHours, nowMs);
    return {
      title: place.title,
      location: place.location,
      areaCluster: cached?.area_cluster || plannerMeta.areaCluster,
      themeTags: plannerMeta.themeTags,
      ticketVnd: cached ? cached.ticket_vnd : plannerMeta.defaultTicketVnd,
      estimatedSpendVnd: cached ? cached.estimated_spend_vnd : plannerMeta.defaultEstimatedSpendVnd,
      priceSource: cached ? cached.price_source : "estimated",
      priceNote: cached?.price_note || void 0,
      sourceUrl: cached?.source_url || void 0,
      fetchedAt: fetchedAt || new Date(nowMs).toISOString(),
      isStale,
      meta: place
    };
  });
}

// server/services/ai/workflow/phase1Intake.ts
import {
  LLM_MODEL_NAME,
  LLM_PROVIDER,
  LLM_SYSTEM,
  LLM_TOKEN_COUNT_COMPLETION,
  LLM_TOKEN_COUNT_PROMPT,
  LLM_TOKEN_COUNT_TOTAL,
  OpenInferenceSpanKind as OpenInferenceSpanKind3,
  SemanticConventions as SemanticConventions2
} from "@arizeai/openinference-semantic-conventions";

// src/data/seasons.ts
var seasonsData = [
  {
    milestone: "01 | Th\xE1ng 1 \u2013 Th\xE1ng 3",
    shortTimelineTitle: "Hoa c\xE0 ph\xEA tr\u1EAFng & L\u1EC5 h\u1ED9i",
    headline: "M\xF9a Xu\xE2n",
    subheadline: "M\xF9a hoa c\xE0 ph\xEA tr\u1EAFng & L\u1EC5 h\u1ED9i c\u1ED3ng chi\xEAng",
    description: "Ti\u1EBFt tr\u1EDDi se l\u1EA1nh kh\xF4 r\xE1o, c\u1EA3 cao nguy\xEAn b\u1EEBng t\u1EC9nh d\u01B0\u1EDBi s\u1EAFc hoa c\xE0 ph\xEA tr\u1EAFng mu\u1ED1t nh\u01B0 tuy\u1EBFt v\xE0 kh\xF4ng kh\xED l\u1EC5 h\u1ED9i r\u1ED9n r\xE0ng kh\u1EAFp c\xE1c bu\xF4n l\xE0ng.",
    cta: "L\xEAn k\u1EBF ho\u1EA1ch m\xF9a hoa c\xE0 ph\xEA",
    caption: "Th\u01B0\u1EDBc phim: Hoa c\xE0 ph\xEA bung n\u1EDF tr\u1EAFng cao nguy\xEAn",
    plannerTheme: "coffee",
    videoId: "A5ddpVRjkuc",
    videoStart: 1700,
    videoEnd: 1710,
    palette: { top: "#163022", mid: "#2D4B38", bottom: "#4D3826", accent: "#FFFFFF" }
  },
  {
    milestone: "02 | Th\xE1ng 4 \u2013 Th\xE1ng 6",
    shortTimelineTitle: "N\u1EAFng v\xE0ng & H\u1ED3 L\u1EAFk",
    headline: "M\xF9a H\u1EA1",
    subheadline: "N\u1EAFng v\xE0ng r\u1EF1c r\u1EE1 & S\u1EE9c s\u1ED1ng \u0111\u1EA1i ng\xE0n",
    description: "N\u1EAFng cao nguy\xEAn chan h\xF2a, s\u1EAFc hoa mu\u1ED3ng v\xE0ng r\u1EF1c r\u1EE1 tr\xEAn nh\u1EEFng cung \u0111\u01B0\u1EDDng \u0111\u1EA5t \u0111\u1ECF, l\xFD t\u01B0\u1EDFng \u0111\u1EC3 kh\xE1m ph\xE1 h\u1ED3 L\u1EAFk v\xE0 c\xE1c ho\u1EA1t \u0111\u1ED9ng ngo\xE0i tr\u1EDDi.",
    cta: "Kh\xE1m ph\xE1 cung \u0111\u01B0\u1EDDng n\u1EAFng cao nguy\xEAn",
    caption: "Th\u01B0\u1EDBc phim: N\u1EAFng v\xE0ng tr\xEAn m\u1EB7t g\u01B0\u01A1ng H\u1ED3 L\u1EAFk",
    plannerTheme: "coffee",
    videoId: "aeE9yVUTRTg",
    videoStart: 10,
    videoEnd: null,
    palette: { top: "#183629", mid: "#3B5934", bottom: "#8F5B24", accent: "#F4C44E" }
  },
  {
    milestone: "03 | Th\xE1ng 7 \u2013 Th\xE1ng 9",
    shortTimelineTitle: "M\u01B0a r\u1EEBng & Th\xE1c Dray Nur",
    headline: "M\xF9a Thu",
    subheadline: "M\xF9a m\u01B0a r\u1EEBng & Nh\u1EEFng ng\u1ECDn th\xE1c h\xF9ng v\u0129",
    description: "Nh\u1EEFng c\u01A1n m\u01B0a t\u01B0\u1EDBi m\xE1t \u0111\u1EA1i ng\xE0n, \u0111\xE1nh th\u1EE9c v\u1EBB \u0111\u1EB9p cu\u1ED3n cu\u1ED9n tung b\u1ECDt tr\u1EAFng x\xF3a c\u1EE7a th\xE1c Dray Nur, Dray S\xE1p gi\u1EEFa r\u1EEBng kh\u1ED9p xanh m\u01B0\u1EDBt.",
    cta: "S\u0103n m\xF9a th\xE1c \u0111\u1ED5 Dray Nur",
    caption: "Th\u01B0\u1EDBc phim: Th\xE1c Dray Nur cu\u1ED3n cu\u1ED9n gi\u1EEFa r\u1EEBng xanh",
    plannerTheme: "nature",
    videoId: "7oUAJJW8Blo",
    videoStart: 10,
    videoEnd: null,
    palette: { top: "#0D2118", mid: "#1B4332", bottom: "#274C43", accent: "#D8F3DC" }
  },
  {
    milestone: "04 | Th\xE1ng 10 \u2013 Th\xE1ng 12",
    shortTimelineTitle: "D\xE3 qu\u1EF3 & Thu ho\u1EA1ch c\xE0 ph\xEA",
    headline: "M\xF9a \u0110\xF4ng",
    subheadline: "M\xF9a d\xE3 qu\u1EF3 v\xE0ng & Thu ho\u1EA1ch c\xE0 ph\xEA",
    description: "N\u1EAFng hanh v\xE0ng d\u1ECBu nh\u1EB9, hoa d\xE3 qu\u1EF3 nhu\u1ED9m v\xE0ng tri\u1EC1n \u0111\u1ED3i h\xF2a c\xF9ng nh\u1ECBp s\u1ED1ng r\u1ED9n r\xE3 c\u1EE7a m\xF9a thu ho\u1EA1ch nh\u1EEFng tr\xE1i c\xE0 ph\xEA ch\xEDn \u0111\u1ECF.",
    cta: "\u0110\xF3n m\xF9a d\xE3 qu\u1EF3 & thu ho\u1EA1ch",
    caption: "Th\u01B0\u1EDBc phim: D\xE3 qu\u1EF3 v\xE0ng & M\xF9a h\xE1i c\xE0 ph\xEA ch\xEDn \u0111\u1ECF",
    plannerTheme: "coffee",
    videoId: "hSbKX-mcgmU",
    videoStart: 50,
    videoEnd: 55,
    palette: { top: "#231912", mid: "#4A2B18", bottom: "#7C361D", accent: "#EAB308" }
  }
];

// server/services/ai/workflow/phase2Capacity.ts
function resolveDayCount(duration) {
  if (duration === "2N1D") return 2;
  if (duration === "4N3D+") return 4;
  return 3;
}
function resolveSeasonFromDates(travelDates, rawGoal) {
  const combined = `${travelDates || ""} ${rawGoal || ""}`.toLowerCase();
  let month = null;
  const viMonth = combined.match(/tháng\s*(1[0-2]|[1-9])\b/i);
  const slashDate = combined.match(/\b\d{1,2}\/(1[0-2]|[1-9])(?:\/\d{2,4})?\b/);
  if (viMonth) {
    month = Number(viMonth[1]);
  } else if (slashDate) {
    month = Number(slashDate[1]);
  } else if (/\b(jan|january|feb|february|mar|march)\b/i.test(combined)) {
    month = 2;
  } else if (/\b(apr|april|may|jun|june)\b/i.test(combined)) {
    month = 5;
  } else if (/\b(jul|july|aug|august|sep|sept|september)\b/i.test(combined)) {
    month = 8;
  } else if (/\b(oct|october|nov|november|dec|december)\b/i.test(combined)) {
    month = 12;
  } else if (/(hoa cà phê|mùa xuân|tết|cồng chiêng)/i.test(combined)) {
    month = 2;
  } else if (/(mùa hạ|nắng vàng)/i.test(combined)) {
    month = 5;
  } else if (/(mùa mưa|mùa thu|thác đổ|thác nước)/i.test(combined)) {
    month = 8;
  } else if (/(dã quỳ|thu hoạch|mùa đông|cuối năm)/i.test(combined)) {
    month = 11;
  }
  if (month !== null) {
    if (month >= 1 && month <= 3) return seasonsData[0];
    if (month >= 4 && month <= 6) return seasonsData[1];
    if (month >= 7 && month <= 9) return seasonsData[2];
    return seasonsData[3];
  }
  const currentMonth = (/* @__PURE__ */ new Date()).getMonth() + 1;
  if (currentMonth <= 3) return seasonsData[0];
  if (currentMonth <= 6) return seasonsData[1];
  if (currentMonth <= 9) return seasonsData[2];
  return seasonsData[3];
}
function computePacing(dayCount, companionType) {
  if (companionType === "family") {
    const maxStopsTotal2 = dayCount <= 2 ? 4 : dayCount === 3 ? 6 : 8;
    return { maxStopsPerDay: 2, maxStopsTotal: maxStopsTotal2 };
  }
  if (companionType === "solo") {
    const maxStopsTotal2 = dayCount <= 2 ? 5 : dayCount === 3 ? 9 : 11;
    return { maxStopsPerDay: 3, maxStopsTotal: maxStopsTotal2 };
  }
  const maxStopsTotal = dayCount <= 2 ? 5 : dayCount === 3 ? 8 : 10;
  return { maxStopsPerDay: 3, maxStopsTotal };
}
async function runPhase2Capacity(intake, overrides) {
  const isEn = overrides?.lang === "en";
  const dayCount = resolveDayCount(intake.duration);
  const companionType = intake.companionType || "couple";
  const travelersCount = intake.travelersCount && intake.travelersCount > 0 ? intake.travelersCount : companionType === "solo" ? 1 : companionType === "couple" ? 2 : 4;
  const season = resolveSeasonFromDates(intake.travelDates, intake.rawUserGoal);
  const { maxStopsPerDay, maxStopsTotal } = computePacing(dayCount, companionType);
  const maxDailyDistanceKm = 120;
  const estimatedBudgetVnd = intake.totalBudgetVnd && intake.totalBudgetVnd > 0 ? intake.totalBudgetVnd : budgetMultipliers[intake.budgetTier].perDay * dayCount * travelersCount;
  const nights = Math.max(1, dayCount - 1);
  const lodgingCapVnd = estimatedBudgetVnd * AI_PRICE_POLICY.lodgingShareCapPct / 100;
  const transitCapVnd = estimatedBudgetVnd * AI_PRICE_POLICY.transitShareCapPct / 100;
  const allStays = overrides?.stays ?? await listActiveStays({ travelersCount, companionType });
  const allLogistics = overrides?.logistics ?? await listActiveLogistics({ travelersCount, companionType });
  const notes = [];
  const stayMatchesBudget = allStays.filter((stay) => {
    const rooms = Math.max(1, Math.ceil(travelersCount / Math.max(1, stay.capacityMax)));
    return stay.nightlyRateVnd * nights * rooms <= lodgingCapVnd;
  });
  const recommendedStays = stayMatchesBudget.length > 0 ? stayMatchesBudget : allStays.slice(0, 1);
  if (stayMatchesBudget.length === 0 && recommendedStays.length > 0) {
    notes.push(
      isEn ? `Tight lodging budget (${Math.round(lodgingCapVnd).toLocaleString("en-US")} VND); selected the most economical stay option.` : `Ng\xE2n s\xE1ch l\u01B0u tr\xFA ch\u1EB7t (${Math.round(lodgingCapVnd).toLocaleString("vi-VN")}\u0111); ch\u1ECDn ph\u01B0\u01A1ng \xE1n ti\u1EBFt ki\u1EC7m nh\u1EA5t.`
    );
  }
  const selectedStay = recommendedStays.find((s) => s.tier === intake.budgetTier) || recommendedStays[recommendedStays.length - 1] || null;
  const logisticsMatchesBudget = allLogistics.filter(
    (item) => item.dailyRateVnd * dayCount <= transitCapVnd
  );
  const recommendedLogistics = logisticsMatchesBudget.length > 0 ? logisticsMatchesBudget : allLogistics.slice(0, 1);
  if (logisticsMatchesBudget.length === 0 && recommendedLogistics.length > 0) {
    notes.push(
      isEn ? `Tight transit budget (${Math.round(transitCapVnd).toLocaleString("en-US")} VND); prioritized the most economical transport option.` : `Ng\xE2n s\xE1ch di chuy\u1EC3n ch\u1EB7t (${Math.round(transitCapVnd).toLocaleString("vi-VN")}\u0111); \u01B0u ti\xEAn ph\u01B0\u01A1ng ti\u1EC7n ti\u1EBFt ki\u1EC7m nh\u1EA5t.`
    );
  }
  const selectedLogistics = recommendedLogistics.find(
    (l) => l.tier === intake.budgetTier && l.suitableFor.includes(companionType)
  ) || recommendedLogistics.find((l) => l.suitableFor.includes(companionType)) || recommendedLogistics[0] || null;
  if (companionType === "family") {
    notes.push(
      isEn ? "Family pacing is relaxed to allow extra rest time and minimize long driving legs." : "Nh\u1ECBp \u0111\u1ED9 gia \u0111\xECnh \u0111\u01B0\u1EE3c gi\u1EA3m t\u1EA3i \u0111\u1EC3 c\xF3 th\u1EDDi gian ngh\u1EC9 ng\u01A1i v\xE0 h\u1EA1n ch\u1EBF di chuy\u1EC3n xa."
    );
  } else if (companionType === "solo") {
    notes.push(
      isEn ? "Flexible solo itinerary prioritizing motorbike or main-route shuttle transport." : "L\u1ECBch tr\xECnh \u0111\u1ED9c h\xE0nh linh ho\u1EA1t, \u01B0u ti\xEAn xe m\xE1y ho\u1EB7c shuttle tuy\u1EBFn ch\xEDnh."
    );
  }
  return {
    dayCount,
    duration: intake.duration,
    travelersCount,
    companionType,
    seasonMilestone: season.milestone,
    seasonHeadline: `${season.headline} (${season.subheadline})`,
    seasonTheme: season.plannerTheme,
    maxStopsPerDay,
    maxStopsTotal,
    maxDailyDistanceKm,
    recommendedStays,
    selectedStay,
    recommendedLogistics,
    selectedLogistics,
    notes
  };
}

// server/services/ai/workflow/phase1Intake.ts
var VALID_THEMES = ["coffee", "culture", "nature", "cuisine"];
var VALID_DURATIONS = ["2N1D", "3N2D", "4N3D+"];
var VALID_COMPANIONS = ["solo", "couple", "family", "friends"];
var VALID_BUDGETS = ["budget", "standard", "luxury"];
var DEFAULT_TRAVELERS_BY_COMPANION = {
  solo: 1,
  couple: 2,
  family: 4,
  friends: 4
};
function inferTravelersCountFromCompanion(companionType) {
  if (!companionType || !VALID_COMPANIONS.includes(companionType)) {
    return null;
  }
  return DEFAULT_TRAVELERS_BY_COMPANION[companionType];
}
function buildClarificationOptions(lang, missingFields) {
  const options = [];
  if (missingFields.includes("travelers")) {
    if (lang === "en") {
      options.push(
        { field: "travelers", label: "Solo (1 traveler)", valueText: "Solo trip (1 person)" },
        { field: "travelers", label: "Couple (2 travelers)", valueText: "Couple (2 travelers)" },
        { field: "travelers", label: "Family (4 travelers)", valueText: "Family of 4" },
        { field: "travelers", label: "Friends (4 travelers)", valueText: "Group of 4 friends" }
      );
    } else {
      options.push(
        { field: "travelers", label: "\u0110\u1ED9c h\xE0nh (1 ng\u01B0\u1EDDi)", valueText: "\u0110i 1 m\xECnh (\u0111\u1ED9c h\xE0nh)" },
        { field: "travelers", label: "C\u1EB7p \u0111\xF4i (2 ng\u01B0\u1EDDi)", valueText: "C\u1EB7p \u0111\xF4i 2 ng\u01B0\u1EDDi" },
        { field: "travelers", label: "Gia \u0111\xECnh (4 ng\u01B0\u1EDDi)", valueText: "Gia \u0111\xECnh 4 ng\u01B0\u1EDDi" },
        { field: "travelers", label: "Nh\xF3m b\u1EA1n (4 ng\u01B0\u1EDDi)", valueText: "Nh\xF3m b\u1EA1n 4 ng\u01B0\u1EDDi" }
      );
    }
  }
  if (missingFields.includes("dates")) {
    if (lang === "en") {
      options.push(
        { field: "dates", label: "2D1N \u2022 Weekend", valueText: "2N1D weekend trip" },
        { field: "dates", label: "3D2N \u2022 March (Coffee blossom)", valueText: "3N2D in March" },
        { field: "dates", label: "3D2N \u2022 August (Waterfalls)", valueText: "3N2D in August" },
        { field: "dates", label: "4D3N \u2022 November (Wildflowers)", valueText: "4N3D in November" }
      );
    } else {
      options.push(
        { field: "dates", label: "2N1\u0110 \u2022 Cu\u1ED1i tu\u1EA7n", valueText: "2N1\u0110" },
        { field: "dates", label: "3N2\u0110 \u2022 Th\xE1ng 3 (Hoa c\xE0 ph\xEA)", valueText: "3N2\u0110 v\xE0o th\xE1ng 3" },
        { field: "dates", label: "3N2\u0110 \u2022 Th\xE1ng 8 (M\xF9a th\xE1c)", valueText: "3N2\u0110 v\xE0o th\xE1ng 8" },
        { field: "dates", label: "4N3\u0110 \u2022 Th\xE1ng 11 (D\xE3 qu\u1EF3)", valueText: "4N3\u0110 v\xE0o th\xE1ng 11" }
      );
    }
  }
  if (missingFields.includes("budget")) {
    if (lang === "en") {
      options.push(
        {
          field: "budget",
          label: "Budget (~3\u20134M VND)",
          valueText: "Budget tier around 4 million VND"
        },
        {
          field: "budget",
          label: "Standard (~7\u201310M VND)",
          valueText: "Standard tier around 8 million VND"
        },
        {
          field: "budget",
          label: "Luxury (~15M+ VND)",
          valueText: "Luxury tier around 15 million VND"
        }
      );
    } else {
      options.push(
        {
          field: "budget",
          label: "Ti\u1EBFt ki\u1EC7m (~3\u20134 tri\u1EC7u)",
          valueText: "Ng\xE2n s\xE1ch ti\u1EBFt ki\u1EC7m kho\u1EA3ng 4 tri\u1EC7u"
        },
        {
          field: "budget",
          label: "Ti\xEAu chu\u1EA9n (~7\u201310 tri\u1EC7u)",
          valueText: "Ng\xE2n s\xE1ch ti\xEAu chu\u1EA9n kho\u1EA3ng 8 tri\u1EC7u"
        },
        {
          field: "budget",
          label: "Cao c\u1EA5p (~15+ tri\u1EC7u)",
          valueText: "Ng\xE2n s\xE1ch cao c\u1EA5p kho\u1EA3ng 15 tri\u1EC7u"
        }
      );
    }
  }
  return options;
}
function normalizeText(raw) {
  return String(raw || "").trim();
}
function extractBudgetVndFromText(rawText, travelersHint) {
  const text = rawText.toLowerCase();
  let totalBudgetVnd = null;
  let budgetTier = null;
  let explicitMention = false;
  const isPerPerson = /(\/người|\/khách|mỗi người|1 người|per person|each|pp\b)/i.test(text);
  const millionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b|million|m\b)/i);
  if (millionMatch) {
    const val = Number(millionMatch[1].replace(",", ".")) * 1e6;
    if (Number.isFinite(val) && val >= 3e5 && val <= 5e8) {
      totalBudgetVnd = Math.round(isPerPerson && travelersHint ? val * travelersHint : val);
      explicitMention = true;
    }
  }
  if (totalBudgetVnd === null) {
    const fullVndMatch = text.match(
      /(\d{1,3}(?:[.,]\d{3})+|\d{6,9})\s*(?:đồng|vnđ|vnd|đ)?(?=$|[^\p{L}\p{N}_])/iu
    );
    if (fullVndMatch) {
      const cleaned = Number(fullVndMatch[1].replace(/[.,]/g, ""));
      if (Number.isFinite(cleaned) && cleaned >= 3e5 && cleaned <= 5e8) {
        totalBudgetVnd = Math.round(isPerPerson && travelersHint ? cleaned * travelersHint : cleaned);
        explicitMention = true;
      }
    }
  }
  if (totalBudgetVnd === null) {
    const kMatch = text.match(/(\d{3,4})\s*k\b/i);
    if (kMatch) {
      const val = Number(kMatch[1]) * 1e3;
      if (Number.isFinite(val) && val >= 3e5) {
        totalBudgetVnd = Math.round(isPerPerson && travelersHint ? val * travelersHint : val);
        explicitMention = true;
      }
    }
  }
  if (/(tiết kiệm|bình dân|sinh viên|giá rẻ|homestay|budget|low[- ]cost|cheap)/i.test(text)) {
    budgetTier = "budget";
    explicitMention = true;
  } else if (/(cao cấp|nghỉ dưỡng|resort|5 sao|sang trọng|luxury|premium)/i.test(text)) {
    budgetTier = "luxury";
    explicitMention = true;
  } else if (/(tiêu chuẩn|vừa phải|tầm trung|trung bình|standard|moderate|mid[- ]range)/i.test(text)) {
    budgetTier = "standard";
    explicitMention = true;
  }
  if (totalBudgetVnd !== null && budgetTier === null) {
    const perDay = totalBudgetVnd / (3 * (travelersHint || 2));
    if (perDay < budgetMultipliers.budget.perDay * 1.15) {
      budgetTier = "budget";
    } else if (perDay >= budgetMultipliers.luxury.perDay * 0.85) {
      budgetTier = "luxury";
    } else {
      budgetTier = "standard";
    }
  }
  return { totalBudgetVnd, budgetTier, explicitMention };
}
function extractTravelersFromText(rawText) {
  const text = rawText.toLowerCase();
  let travelersCount = null;
  let companionType = null;
  let explicitMention = false;
  const countMatch = text.match(
    /(\d+)\s*(?:người|khách|bạn|thành viên|người lớn|adults?|people|persons?|travelers?|guests?|pax)\b/i
  );
  if (countMatch) {
    const n = Number(countMatch[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 30) {
      travelersCount = n;
      explicitMention = true;
    }
  } else {
    const wordNumMap = {
      m\u1ED9t: 1,
      hai: 2,
      ba: 3,
      b\u1ED1n: 4,
      n\u0103m: 5,
      s\u00E1u: 6,
      b\u1EA3y: 7,
      t\u00E1m: 8
    };
    const wordMatch = text.match(
      /\b(một|hai|ba|bốn|năm|sáu|bảy|tám)\s+(?:người|khách|bạn|thành viên)\b/i
    );
    if (wordMatch) {
      travelersCount = wordNumMap[wordMatch[1].toLowerCase()] ?? null;
      if (travelersCount !== null) explicitMention = true;
    }
  }
  if (/(độc hành|một mình|1 mình|đi riêng|solo)/i.test(text)) {
    companionType = "solo";
    if (travelersCount === null) travelersCount = 1;
    explicitMention = true;
  } else if (/(gia đình|bố mẹ|trẻ nhỏ|con nhỏ|ông bà|family|kids|children)/i.test(text)) {
    companionType = "family";
    if (travelersCount === null) travelersCount = 4;
    explicitMention = true;
  } else if (/(nhóm bạn|bạn bè|hội bạn|team|friends|group)/i.test(text)) {
    companionType = "friends";
    if (travelersCount === null) travelersCount = 4;
    explicitMention = true;
  } else if (/(cặp đôi|người yêu|vợ chồng|lãng mạn|honeymoon|couple)/i.test(text)) {
    companionType = "couple";
    if (travelersCount === null) travelersCount = 2;
    explicitMention = true;
  } else if (travelersCount === 1) {
    companionType = "solo";
  } else if (travelersCount === 2) {
    companionType = "couple";
  } else if (travelersCount !== null && travelersCount >= 3) {
    companionType = "friends";
  }
  return { travelersCount, companionType, explicitMention };
}
function extractDatesAndDurationFromText(rawText) {
  const text = rawText.toLowerCase();
  let duration = null;
  const dateHints = [];
  if (/(2n1[đd]|2\s*ngày|2d1n|2\s*days?|cuối tuần|weekend)/i.test(text)) {
    duration = "2N1D";
    dateHints.push("2N1D");
  } else if (/(4n3[đd]|4\s*ngày|5\s*ngày|4d3n|4\s*days?|5\s*days?|dài ngày)/i.test(text)) {
    duration = "4N3D+";
    dateHints.push("4N3D+");
  } else if (/(3n2[đd]|3\s*ngày|3d2n|3\s*days?)/i.test(text)) {
    duration = "3N2D";
    dateHints.push("3N2D");
  }
  const viMonthMatch = text.match(/tháng\s*(1[0-2]|[1-9])\b/i);
  const shortMonthMatch = text.match(/\bt(1[0-2]|[1-9])\b/i);
  const enMonthMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i
  );
  const dateRangeMatch = text.match(/\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/);
  const seasonKeywordMatch = text.match(
    /(mùa hoa cà phê|mùa mưa|mùa khô|mùa dã quỳ|mùa thu hoạch|dịp lễ|tết|mùa xuân|mùa hạ|mùa thu|mùa đông|harvest season|waterfall season)/i
  );
  if (viMonthMatch) dateHints.push(`Th\xE1ng ${viMonthMatch[1]}`);
  else if (shortMonthMatch) dateHints.push(`Th\xE1ng ${shortMonthMatch[1]}`);
  else if (enMonthMatch) dateHints.push(enMonthMatch[1]);
  if (dateRangeMatch) dateHints.push(dateRangeMatch[1]);
  if (seasonKeywordMatch) dateHints.push(seasonKeywordMatch[1]);
  const uniqueHints = Array.from(new Set(dateHints));
  return {
    travelDates: uniqueHints.length > 0 ? uniqueHints.join(" \u2022 ") : null,
    duration,
    explicitMention: uniqueHints.length > 0
  };
}
function extractPurposeFromText(rawText, fallbackTheme) {
  const text = rawText.toLowerCase();
  const scores = {
    coffee: 0,
    culture: 0,
    nature: 0,
    cuisine: 0
  };
  const interests = [];
  if (/(cà phê|coffee|robusta|cupping|nông trại|ea tân|trung nguyên)/i.test(text)) {
    scores.coffee += 3;
    interests.push("c\xE0 ph\xEA \u0111\u1EB7c s\u1EA3n");
  }
  if (/(văn hóa|cồng chiêng|nhà dài|mẫu hệ|thổ cẩm|gốm|di sản|ako dhông|bảo tàng|culture|heritage)/i.test(text)) {
    scores.culture += 3;
    interests.push("di s\u1EA3n b\u1EA3n \u0111\u1ECBa");
  }
  if (/(thác|dray nur|yok đôn|rừng|trekking|thiên nhiên|chèo sup|độc mộc|voi|hồ lắk|đá voi|waterfall|nature)/i.test(text)) {
    scores.nature += 3;
    interests.push("thi\xEAn nhi\xEAn & th\xE1c");
  }
  if (/(ẩm thực|ăn uống|món ăn|food|cuisine|bún đỏ|bún chìa|gà nướng|cơm lam|cá lăng|bánh ướt|lá bép)/i.test(text)) {
    scores.cuisine += 3;
    interests.push("\u1EA9m th\u1EF1c b\u1EA3n \u0111\u1ECBa");
  }
  let bestTheme = fallbackTheme;
  let bestScore = 0;
  for (const theme of VALID_THEMES) {
    if (scores[theme] > bestScore) {
      bestScore = scores[theme];
      bestTheme = theme;
    }
  }
  return { mainPurpose: bestTheme, secondaryInterests: interests };
}
function buildClarificationQuestion(lang, missingFields) {
  if (lang === "en") {
    const parts2 = [];
    if (missingFields.includes("travelers")) parts2.push("how many travelers / group type (solo, couple, family, friends)");
    if (missingFields.includes("dates")) parts2.push("your travel dates or trip length (e.g., 2N1D, 3N2D, month)");
    if (missingFields.includes("budget")) parts2.push("your estimated budget (in VND or budget/standard/luxury tier)");
    return `To tailor an accurate \u0110\u1EAFk L\u1EAFk itinerary for you, could you share ${parts2.join(", ")}? Or pick one of the preset plans below to start right away.`;
  }
  const parts = [];
  if (missingFields.includes("travelers")) parts.push("s\u1ED1 l\u01B0\u1EE3ng ng\u01B0\u1EDDi \u0111i (\u0111\u1ED9c h\xE0nh, c\u1EB7p \u0111\xF4i, gia \u0111\xECnh hay nh\xF3m b\u1EA1n)");
  if (missingFields.includes("dates")) parts.push("th\u1EDDi gian d\u1EF1 ki\u1EBFn ho\u1EB7c s\u1ED1 ng\xE0y (v\xED d\u1EE5 2N1\u0110, 3N2\u0110, th\xE1ng m\u1EA5y)");
  if (missingFields.includes("budget")) parts.push("ng\xE2n s\xE1ch d\u1EF1 ki\u1EBFn (v\xED d\u1EE5 4\u20136 tri\u1EC7u ho\u1EB7c m\u1EE9c Ti\u1EBFt ki\u1EC7m / Ti\xEAu chu\u1EA9n / Cao c\u1EA5p)");
  return `\u0110\u1EC3 m\xECnh thi\u1EBFt k\u1EBF l\u1ECBch tr\xECnh \u0110\u1EAFk L\u1EAFk chu\u1EA9n x\xE1c v\xE0 s\xE1t chi ph\xED th\u1EF1c t\u1EBF, b\u1EA1n cho m\xECnh bi\u1EBFt th\xEAm: ${parts.join("; ")} nh\xE9! Ho\u1EB7c b\u1EA1n c\xF3 th\u1EC3 ch\u1ECDn nhanh m\u1ED9t g\u1EE3i \xFD l\u1ECBch tr\xECnh b\xEAn d\u01B0\u1EDBi.`;
}
function foldVietnamese(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
}
var QUESTION_OR_INFO_REGEX = /(\?|có\s+[^\n.!?]{1,60}\s+(?:không|ko|k|chưa|nào)(?=$|[^\p{L}\p{N}_])|(?:được|đúng|phải|hay|ngon|đẹp|ổn|an toàn|tiện|kịp|đắt|rẻ|xa|gần)\s+(?:không|ko|chưa)(?=$|[^\p{L}\p{N}_])|bao nhiêu|bao xa|bao lâu|mấy giờ|giờ mở cửa|giờ đóng cửa|mấy km|xa không|ở đâu|địa chỉ|chỗ nào|nơi nào|quán nào|nhà hàng nào|khách sạn nào|homestay nào|resort nào|xe nào|hãng nào|đường nào|món nào|loại nào|khi nào|lúc nào|ngày nào|tại sao|vì sao|sao lại|là gì|nghĩa là gì|ăn gì|uống gì|chơi gì|mua gì|xem gì|quà gì|cần\s+(?:giấy tờ|thủ tục|chuẩn bị|mang|lưu ý)?\s*gì|giấy tờ gì|lưu ý gì|kinh nghiệm|thế nào|ra sao|như thế nào|có gì|nên ăn|nên ở|có nên|làm sao|mặc gì|review|đánh giá|gợi ý|giới thiệu|kể tên|liệt kê|thông tin về|cho hỏi|cho mình hỏi|cho biết|muốn biết|xin thêm|hỏi\s+(?:chút|thêm|về)|liệu\s+có|tiện ích|hồ bơi|bể bơi|bữa sáng|giá phòng|giá vé|giá thuê|1\s*đêm|mỗi đêm|thời tiết|khí hậu|dự báo|mùa nào|tháng mấy|lễ hội|văn hóa|lịch sử|đặc sản|sân bay|vé máy bay|xe khách|taxi|what|when|where|which|who|how|why|does\s+.*\s+have|is\s+there|are\s+there|can\s+(?:i|we|you)|should\s+(?:i|we)|do\s+(?:i|we)\s+need|is\s+it|how much|how far|how long|opening hours|amenities|pool|weather|season|tips|tell me|explain|recommend|suggest|info about|information on)/iu;
var PRIMARY_AMENITY_OR_INFO_QUESTION_REGEX = /(\?|có\s+[^\n.!?]{1,60}\s+(?:không|ko|k|chưa)(?=$|[^\p{L}\p{N}_])|(?:được|đúng|phải|hay|ngon|đẹp|ổn|an toàn|tiện|kịp|đắt|rẻ|xa|gần)\s+(?:không|ko|chưa)(?=$|[^\p{L}\p{N}_])|bao nhiêu|bao xa|bao lâu|mấy giờ|giờ mở cửa|giờ đóng cửa|ở đâu|địa chỉ|chỗ nào|nơi nào|quán nào|nhà hàng nào|khách sạn nào|homestay nào|resort nào|xe nào|hãng nào|khi nào|lúc nào|tại sao|vì sao|là gì|ăn gì|uống gì|chơi gì|mua gì|cần\s+(?:giấy tờ|thủ tục|chuẩn bị|mang|lưu ý)?\s*gì|giấy tờ gì|lưu ý gì|kinh nghiệm|thế nào|ra sao|như thế nào|có nên|làm sao|review|đánh giá|giới thiệu|kể tên|thông tin về|muốn biết|xin thêm|cho hỏi|cho mình hỏi|tiện ích|hồ bơi|bể bơi|giá phòng|giá vé|giá thuê|1\s*đêm|mỗi đêm|thời tiết|dự báo|mùa nào|tháng mấy|lễ hội|sân bay|vé máy bay|xe khách|taxi|what|when|where|which|who|how|why|how much|how far|does\s+.*\s+have|is\s+there|are\s+there|can\s+(?:i|we)|should\s+(?:i|we)|amenities|pool|opening hours|weather|tell me|explain)/iu;
function isQuestionOrInfoRequest(text) {
  const lower = String(text || "").toLowerCase().trim();
  if (!lower) return false;
  return QUESTION_OR_INFO_REGEX.test(lower) || /\btư vấn\b/i.test(lower);
}
function isPrimaryAmenityOrInfoQuestion(text) {
  const lower = String(text || "").toLowerCase().trim();
  if (!lower) return false;
  return PRIMARY_AMENITY_OR_INFO_QUESTION_REGEX.test(lower);
}
async function loadGroundedQaContext(options) {
  let rawStays = options?.stays ?? [];
  if (!options?.stays) {
    try {
      rawStays = await listActiveStays();
    } catch {
      rawStays = [];
    }
  }
  let rawLogistics = options?.logistics ?? [];
  if (!options?.logistics) {
    try {
      rawLogistics = await listActiveLogistics();
    } catch {
      rawLogistics = [];
    }
  }
  let places = [];
  try {
    places = (await listEnrichedPlaces()).map((p) => ({
      title: p.title,
      location: p.location,
      category: p.meta.category,
      areaCluster: p.areaCluster,
      time: p.meta.time,
      period: p.meta.period,
      duration: p.meta.duration,
      rating: p.meta.rating,
      ticketVnd: p.ticketVnd,
      estimatedSpendVnd: p.estimatedSpendVnd,
      priceNote: p.priceNote,
      desc: p.meta.desc
    }));
  } catch {
    places = dakLakPlaceDirectory.map((meta) => {
      const inferred = inferPlaceMetadata(meta);
      return {
        title: meta.title,
        location: meta.location,
        category: meta.category,
        areaCluster: inferred.areaCluster,
        time: meta.time,
        period: meta.period,
        duration: meta.duration,
        rating: meta.rating,
        ticketVnd: inferred.defaultTicketVnd,
        estimatedSpendVnd: inferred.defaultEstimatedSpendVnd,
        desc: meta.desc
      };
    });
  }
  return {
    stays: rawStays.map((s) => ({
      name: s.name,
      area: s.area,
      tier: s.tier,
      nightlyRateVnd: s.nightlyRateVnd,
      capacityMin: s.capacityMin,
      capacityMax: s.capacityMax,
      amenities: s.amenities,
      ...s.sourceNote ? { sourceNote: s.sourceNote } : {}
    })),
    logistics: rawLogistics.map((l) => ({
      mode: l.mode,
      label: l.label,
      tier: l.tier,
      dailyRateVnd: l.dailyRateVnd,
      capacityMin: l.capacityMin,
      capacityMax: l.capacityMax,
      notes: l.notes
    })),
    places,
    seasons: seasonsData.map((s) => ({
      milestone: s.milestone,
      headline: s.headline,
      subheadline: s.subheadline,
      description: s.description
    }))
  };
}
async function maybeFetchTavilyQaContext(queryText, options) {
  if (options?.enableTavily === false) {
    return { snippets: [], citations: [], status: "disabled" };
  }
  const apiKey = getTavilyApiKey();
  if (!apiKey && !options?.tavilyClient) {
    return {
      snippets: [],
      citations: [],
      status: "missing_api_key",
      error: "TAVILY_API_KEY is not configured"
    };
  }
  const trimmed = String(queryText || "").trim();
  if (trimmed.length < 3) {
    return { snippets: [], citations: [], status: "empty_query" };
  }
  const folded = foldVietnamese(trimmed);
  const needsExternalCheck = isQuestionOrInfoRequest(trimmed) || isPrimaryAmenityOrInfoQuestion(trimmed) || /(ho boi|be boi|pool|wifi|an sang|giay to|thu tuc|bang lai|mo cua|dong cua|gia ve|gia phong|1 dem|review|thue xe|thue thuyen|thoi tiet|du bao|le hoi|san bay|may bay|xe khach|limousine|taxi|khach san|homestay|resort|quan an|nha hang|ca phe|dac san|van hoa|lich su|dia chi|o dau|bao xa|kinh nghiem|kotam|ko tam|buon don|ban don|ho lak|buon jun|chu yang sin|ea kao|khai doan|weather|flight|airport|bus|hotel|restaurant|cafe|festival|history|culture)/i.test(
    folded
  );
  if (!needsExternalCheck) {
    return { snippets: [], citations: [], status: "disabled" };
  }
  const res = await searchGeneralQaWithTavily(trimmed, {
    enableTavily: options?.enableTavily,
    tavilyClient: options?.tavilyClient,
    timeoutMs: options?.timeoutMs
  });
  return {
    ...res.answer ? { answer: res.answer } : {},
    snippets: res.snippets,
    citations: res.citations,
    ...res.status ? { status: res.status } : {},
    ...res.error ? { error: res.error } : {}
  };
}
var AMENITY_MATCHERS = [
  {
    key: "pool",
    labelVi: "h\u1ED3 b\u01A1i",
    labelEn: "swimming pool",
    patterns: ["ho boi", "be boi", "swimming pool", "pool"]
  },
  {
    key: "breakfast",
    labelVi: "b\u1EEFa s\xE1ng / buffet s\xE1ng",
    labelEn: "breakfast",
    patterns: ["an sang", "buffet", "breakfast"]
  },
  {
    key: "wifi",
    labelVi: "Wi-Fi",
    labelEn: "Wi-Fi",
    patterns: ["wifi", "wi-fi", "internet"]
  },
  {
    key: "spa",
    labelVi: "spa",
    labelEn: "spa",
    patterns: ["spa", "massage", "thao moc"]
  },
  {
    key: "shuttle",
    labelVi: "\u0111\u01B0a \u0111\xF3n s\xE2n bay",
    labelEn: "airport shuttle",
    patterns: ["dua don", "san bay", "shuttle", "airport"]
  },
  {
    key: "boat",
    labelVi: "ch\xE8o kayak / thuy\u1EC1n",
    labelEn: "kayak / boat",
    patterns: ["kayak", "thuyen", "doc moc"]
  },
  {
    key: "kitchen",
    labelVi: "b\u1EBFp chung",
    labelEn: "shared kitchen",
    patterns: ["bep", "nau an", "kitchen"]
  },
  {
    key: "motorbike",
    labelVi: "h\u1ED7 tr\u1EE3 thu\xEA xe m\xE1y",
    labelEn: "motorbike rental",
    patterns: ["thue xe may"]
  }
];
var STAY_STOPWORDS = /* @__PURE__ */ new Set([
  "homestay",
  "hotel",
  "khach",
  "san",
  "resort",
  "villa",
  "bungalow",
  "buon",
  "ma",
  "thuot",
  "bmt",
  "tai",
  "o",
  "va",
  "&"
]);
function findMatchedStaysInText(foldedMsg, stays) {
  const exact = stays.filter((s) => foldedMsg.includes(foldVietnamese(s.name)));
  if (exact.length > 0) return exact;
  const scored = stays.map((s) => {
    const foldedName = foldVietnamese(s.name);
    const tokens = foldedName.split(/[\s\-&,/]+/).filter((t) => t.length >= 3 && !STAY_STOPWORDS.has(t));
    const matchedTokens = tokens.filter((t) => foldedMsg.includes(t));
    let score = matchedTokens.length;
    if (foldedMsg.includes("ako dhong") && foldedName.includes("ako dhong")) score += 3;
    if (foldedMsg.includes("lak tented") && foldedName.includes("lak tented")) score += 3;
    if (foldedMsg.includes("elephants") && foldedName.includes("elephants")) score += 3;
    if (foldedMsg.includes("muong thanh") && foldedName.includes("muong thanh")) score += 3;
    if (foldedMsg.includes("zan") && foldedName.includes("zan")) score += 3;
    if (foldedMsg.includes("eco-resort") && foldedName.includes("eco-resort")) score += 3;
    return { stay: s, score };
  }).filter((item) => item.score >= 2).sort((a, b) => b.score - a.score);
  return scored.map((x) => x.stay);
}
function findMatchedPlaceInText(foldedMsg, places) {
  for (const p of places) {
    if (foldedMsg.includes(foldVietnamese(p.title))) return p;
  }
  const aliasKeywords = [
    { kw: "bao tang the gioi ca phe", title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA" },
    { kw: "the gioi ca phe", title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA" },
    { kw: "lang ca phe trung nguyen", title: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn" },
    { kw: "trung nguyen", title: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn" },
    { kw: "ako dhong", title: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng" },
    { kw: "bao tang dak lak", title: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk" },
    { kw: "ea tan", title: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n" },
    { kw: "da voi me", title: "\u0110\xE1 Voi M\u1EB9 Yang Tao" },
    { kw: "yang tao", title: "\u0110\xE1 Voi M\u1EB9 Yang Tao" },
    { kw: "ho lak", title: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun" },
    { kw: "buon jun", title: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun" },
    { kw: "biet dien bao dai", title: "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i" },
    { kw: "dray nur", title: "Th\xE1c Dray Nur H\xF9ng V\u0129" },
    { kw: "yok don", title: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n" },
    { kw: "tong ju", title: "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA" },
    { kw: "phan dinh giot", title: "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t" },
    { kw: "ban don", title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n" },
    { kw: "serepok", title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n" }
  ];
  for (const alias of aliasKeywords) {
    if (foldedMsg.includes(alias.kw)) {
      const found = places.find((p) => p.title === alias.title);
      if (found) return found;
    }
  }
  return null;
}
function isLikelyEnglishText(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return false;
  const hasVietnameseDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
    cleaned
  );
  const englishSignals = cleaned.match(
    /\b(the|and|that|with|from|which|they|does|have|indicate|available|including|however|specific|whether|therefore|sources|information|according|based|there|about|provide|around)\b/gi
  ) || [];
  if (englishSignals.length >= 3) return true;
  if (!hasVietnameseDiacritics && englishSignals.length >= 1) return true;
  return false;
}
function resolveEffectiveQaLanguage(message, uiLang) {
  const cleaned = String(message || "").trim();
  if (!cleaned) return uiLang;
  const hasVietnameseDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
    cleaned
  );
  if (hasVietnameseDiacritics) return "vi";
  const folded = foldVietnamese(cleaned);
  if (/\b(khong|bao nhieu|o dau|khi nao|nhu the nao|co nen|giay to|le hoi|cong chieng|buon|thac|homestay|khach san|gia ve|thue thuyen|thue xe)\b/i.test(
    folded
  )) {
    return "vi";
  }
  return uiLang;
}
function buildTavilyReferenceText(isEn, tavilyAnswer, tavilySnippets) {
  const cleanAnswer = typeof tavilyAnswer === "string" && tavilyAnswer.trim() ? tavilyAnswer.trim() : "";
  const validSnippets = (tavilySnippets || []).filter(
    (s) => typeof s?.content === "string" && s.content.trim().length > 0
  );
  if (isEn) {
    if (cleanAnswer) {
      return `

**Live web summary:**
- ${cleanAnswer}`;
    }
    if (validSnippets.length > 0) {
      const bullets = validSnippets.slice(0, 2).map((s) => `- **${s.title}**: ${s.content}`).join("\n");
      return `

**Live web references:**
${bullets}`;
    }
    return "";
  }
  if (cleanAnswer && !isLikelyEnglishText(cleanAnswer)) {
    return `

**Th\xF4ng tin c\u1EADp nh\u1EADt tr\u1EF1c tuy\u1EBFn:**
- ${cleanAnswer}`;
  }
  const vietnameseSnippets = validSnippets.filter((s) => !isLikelyEnglishText(s.content));
  if (vietnameseSnippets.length > 0) {
    const bullets = vietnameseSnippets.slice(0, 2).map((s) => `- **${s.title}**: ${s.content}`).join("\n");
    return `

**Th\xF4ng tin tham kh\u1EA3o tr\u1EF1c tuy\u1EBFn:**
${bullets}`;
  }
  return "";
}
async function buildGroundedQaReplyDeterministic(req, options) {
  const ctx = await loadGroundedQaContext(options);
  const lower = req.message.toLowerCase();
  const folded = foldVietnamese(req.message);
  const days = req.currentState.days;
  const effectiveLang = resolveEffectiveQaLanguage(req.message, req.lang);
  const isEn = effectiveLang === "en";
  const tavilyRef = buildTavilyReferenceText(isEn, options?.tavilyAnswer, options?.tavilySnippets);
  const hasExplicitStayIntent = /(homestay|khach san|hotel|resort|bungalow|villa|luu tru|cho o|noi o|phong o|dat phong|gia phong|1 dem|moi dem|ho boi|be boi|pool|tien ich|amenities|check-in|check-out)/i.test(
    folded
  );
  const rawMatchedStays = findMatchedStaysInText(folded, ctx.stays);
  const matchedStays = hasExplicitStayIntent ? rawMatchedStays : rawMatchedStays.filter((s) => folded.includes(foldVietnamese(s.name)));
  const requestedAmenity = AMENITY_MATCHERS.find(
    (m) => m.patterns.some((pat) => folded.includes(pat))
  );
  const isStayQuery = matchedStays.length > 0 || hasExplicitStayIntent;
  if (isStayQuery && ctx.stays.length > 0) {
    if (matchedStays.length > 0) {
      const stay = matchedStays[0];
      const rateStr = isEn ? `~${stay.nightlyRateVnd.toLocaleString("en-US")} VND/night` : `~${stay.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm`;
      const amenitiesStr = stay.amenities.join(", ");
      if (requestedAmenity) {
        const hasAmenity = stay.amenities.some(
          (a) => requestedAmenity.patterns.some((pat) => foldVietnamese(a).includes(pat))
        );
        const matchingAlternatives = ctx.stays.filter(
          (other) => other.name !== stay.name && other.amenities.some(
            (a) => requestedAmenity.patterns.some((pat) => foldVietnamese(a).includes(pat))
          )
        );
        const wantsHomestay = /\bhomestay\b/i.test(folded);
        if (hasAmenity) {
          return isEn ? `Yes \u2014 in our dataset, **${stay.name}** (${stay.area}, ${stay.tier} tier, ${rateStr}, capacity ${stay.capacityMin}\u2013${stay.capacityMax} guests) lists **${requestedAmenity.labelEn}**. Listed amenities: ${amenitiesStr}.${stay.sourceNote ? ` (${stay.sourceNote})` : ""}${tavilyRef ? ` ${tavilyRef}` : ""}` : `C\xF3 b\u1EA1n nh\xE9 \u2014 trong d\u1EEF li\u1EC7u hi\u1EC7n c\xF3, **${stay.name}** (khu v\u1EF1c ${stay.area}, h\u1EA1ng ${stay.tier}, gi\xE1 tham kh\u1EA3o ${rateStr}, s\u1EE9c ch\u1EE9a ${stay.capacityMin}\u2013${stay.capacityMax} kh\xE1ch) c\xF3 li\u1EC7t k\xEA ti\u1EC7n \xEDch li\xEAn quan \u0111\u1EBFn **${requestedAmenity.labelVi}**. Danh s\xE1ch ti\u1EC7n \xEDch ghi nh\u1EADn: ${amenitiesStr}.${stay.sourceNote ? ` (${stay.sourceNote})` : ""}${tavilyRef ? ` ${tavilyRef}` : ""}`;
        }
        const altText = matchingAlternatives.length > 0 ? isEn ? ` If you need a ${requestedAmenity.labelEn}, stays in our dataset that explicitly list it are: ${matchingAlternatives.map(
          (a) => `${a.name} (${a.area}, ~${a.nightlyRateVnd.toLocaleString("en-US")} VND/night \u2014 ${a.amenities.join(", ")})`
        ).join("; ")}.${wantsHomestay ? " Note that the homestays in our current dataset do not list a swimming pool." : ""}` : ` N\u1EBFu b\u1EA1n \u01B0u ti\xEAn c\xF3 **${requestedAmenity.labelVi}**, trong d\u1EEF li\u1EC7u hi\u1EC7n c\xF3 c\xE1c c\u01A1 s\u1EDF l\u01B0u tr\xFA li\u1EC7t k\xEA r\xF5 ti\u1EC7n \xEDch n\xE0y l\xE0: ${matchingAlternatives.map(
          (a) => `**${a.name}** (${a.area}, ~${a.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm \u2014 ${a.amenities.join(", ")})`
        ).join("; ")}.${wantsHomestay ? " L\u01B0u \xFD: c\xE1c homestay trong d\u1EEF li\u1EC7u hi\u1EC7n t\u1EA1i c\u1EE7a h\u1EC7 th\u1ED1ng \u0111\u1EC1u ch\u01B0a ghi nh\u1EADn c\xF3 h\u1ED3 b\u01A1i." : ""}` : "";
        const tavilyNote = tavilyRef ? ` ${tavilyRef}` : "";
        const noMutationHint = days.length > 0 ? isEn ? ' (Your current itinerary was not modified \u2014 tell me e.g. "\u0110\u1ED5i sang Elephants Hotel" if you want to update your stay.)' : ' (L\u1ECBch tr\xECnh hi\u1EC7n t\u1EA1i c\u1EE7a b\u1EA1n v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF nguy\xEAn \u2014 n\u1EBFu mu\u1ED1n \u0111\u1ED5i n\u01A1i \u1EDF, b\u1EA1n h\xE3y nh\u1EAFn c\u1EE5 th\u1EC3 v\xED d\u1EE5 "\u0110\u1ED5i sang Elephants Hotel" nh\xE9.)' : "";
        return isEn ? `In our current dataset, **${stay.name}** (${stay.area}, ${stay.tier} tier, ${rateStr}) does **not** list or confirm **${requestedAmenity.labelEn}**. Its listed amenities are: ${amenitiesStr}.${altText}${tavilyNote}${noMutationHint}` : `Trong d\u1EEF li\u1EC7u hi\u1EC7n c\xF3 c\u1EE7a h\u1EC7 th\u1ED1ng, **${stay.name}** (khu v\u1EF1c ${stay.area}, h\u1EA1ng ${stay.tier}, gi\xE1 tham kh\u1EA3o ${rateStr}${stay.sourceNote ? ` \u2014 ${stay.sourceNote}` : ""}) **ch\u01B0a ghi nh\u1EADn / kh\xF4ng li\u1EC7t k\xEA ti\u1EC7n \xEDch ${requestedAmenity.labelVi}**. C\xE1c ti\u1EC7n \xEDch hi\u1EC7n c\xF3 c\u1EE7a n\u01A1i n\xE0y g\u1ED3m: ${amenitiesStr}.${altText}${tavilyNote}${noMutationHint}`;
      }
      return isEn ? `**${stay.name}** (${stay.area}, ${stay.tier} tier)
- **Reference rate:** ${rateStr} (${stay.capacityMin}\u2013${stay.capacityMax} guests)
- **Listed amenities:** ${amenitiesStr}${stay.sourceNote ? `
- **Note:** ${stay.sourceNote}` : ""}${tavilyRef}` : `**${stay.name}** (khu v\u1EF1c ${stay.area}, h\u1EA1ng ${stay.tier})
- **Gi\xE1 tham kh\u1EA3o:** ${rateStr} (ph\xF9 h\u1EE3p ${stay.capacityMin}\u2013${stay.capacityMax} kh\xE1ch)
- **Ti\u1EC7n \xEDch ghi nh\u1EADn:** ${amenitiesStr}${stay.sourceNote ? `
- **Ghi ch\xFA:** ${stay.sourceNote}` : ""}${tavilyRef}`;
    }
    if (requestedAmenity) {
      const matchingStays = ctx.stays.filter(
        (s) => s.amenities.some(
          (a) => requestedAmenity.patterns.some((pat) => foldVietnamese(a).includes(pat))
        )
      );
      const wantsHomestay = /\bhomestay\b/i.test(folded);
      if (matchingStays.length > 0) {
        const listStr = matchingStays.map(
          (s) => isEn ? `${s.name} (${s.area}, ~${s.nightlyRateVnd.toLocaleString("en-US")} VND/night \u2014 ${s.amenities.join(", ")})` : `**${s.name}** (${s.area}, ~${s.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm \u2014 ${s.amenities.join(", ")})`
        ).join("; ");
        const homestayCaveat = wantsHomestay && !matchingStays.some((s) => /homestay/i.test(s.name)) ? isEn ? "Our current dataset does not list any homestay with a swimming pool; however, the following local hotels list one: " : "Trong d\u1EEF li\u1EC7u hi\u1EC7n t\u1EA1i ch\u01B0a c\xF3 homestay n\xE0o ghi nh\u1EADn ti\u1EC7n \xEDch h\u1ED3 b\u01A1i; tuy nhi\xEAn b\u1EA1n c\xF3 th\u1EC3 tham kh\u1EA3o c\xE1c kh\xE1ch s\u1EA1n t\u1EA1i BMT c\xF3 ghi nh\u1EADn h\u1ED3 b\u01A1i: " : isEn ? `Stays in our dataset listing ${requestedAmenity.labelEn}: ` : `C\xE1c c\u01A1 s\u1EDF l\u01B0u tr\xFA trong d\u1EEF li\u1EC7u c\xF3 ghi nh\u1EADn **${requestedAmenity.labelVi}**: `;
        return `${homestayCaveat}${listStr}.${tavilyRef ? ` ${tavilyRef}` : ""}`;
      }
    }
    const staysSummary = ctx.stays.map(
      (s) => isEn ? `${s.name} (${s.area}, ${s.tier}, ~${s.nightlyRateVnd.toLocaleString("en-US")} VND/night: ${s.amenities.join(", ")})` : `**${s.name}** (${s.area}, ~${s.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm: ${s.amenities.join(", ")})`
    ).join("; ");
    if (tavilyRef) {
      return isEn ? `${tavilyRef} In our local \u0110\u1EAFk L\u1EAFk accommodation catalog, you can also compare: ${staysSummary}.` : `${tavilyRef} Ngo\xE0i ra, c\xE1c l\u1EF1a ch\u1ECDn l\u01B0u tr\xFA tham kh\u1EA3o t\u1EA1i \u0110\u1EAFk L\u1EAFk trong h\u1EC7 th\u1ED1ng g\u1ED3m: ${staysSummary}.`;
    }
    return isEn ? `Here are the accommodations in our \u0110\u1EAFk L\u1EAFk dataset: ${staysSummary}.` : `C\xE1c l\u1EF1a ch\u1ECDn l\u01B0u tr\xFA tham kh\u1EA3o t\u1EA1i \u0110\u1EAFk L\u1EAFk trong d\u1EEF li\u1EC7u hi\u1EC7n c\xF3 g\u1ED3m: ${staysSummary}.`;
  }
  const isAirportOrIntercityQuery = /(san bay|may bay|ve may bay|xe khach|limousine|ben xe|tu sai gon|tu tphcm|tu ha noi|airport|flight|sleeper bus)/i.test(
    folded
  );
  if (isAirportOrIntercityQuery) {
    const baseAirportInfo = isEn ? "Bu\xF4n Ma Thu\u1ED9t Airport (BMV) is located in H\xF2a Th\u1EAFng commune, ~8\u201310 km east of the city center along National Highway 27 (~15\u201320 minutes by taxi or Grab, costing ~120,000\u2013180,000 VND). Direct flights operate daily from Ho Chi Minh City (SGN) and Hanoi (HAN). By road, sleeper buses and limousines from Ho Chi Minh City take ~7\u20138 hours via National Highway 14." : "S\xE2n bay Bu\xF4n Ma Thu\u1ED9t (BMV) n\u1EB1m t\u1EA1i x\xE3 H\xF2a Th\u1EAFng, c\xE1ch trung t\xE2m th\xE0nh ph\u1ED1 kho\u1EA3ng 8\u201310 km theo tr\u1EE5c Qu\u1ED1c l\u1ED9 27 (di chuy\u1EC3n b\u1EB1ng taxi ho\u1EB7c Grab m\u1EA5t 15\u201320 ph\xFAt, chi ph\xED kho\u1EA3ng 120.000\u0111\u2013180.000\u0111). Hi\u1EC7n c\xF3 c\xE1c \u0111\u01B0\u1EDDng bay th\u1EB3ng h\xE0ng ng\xE0y t\u1EEB TP.HCM v\xE0 H\xE0 N\u1ED9i. N\u1EBFu \u0111i \u0111\u01B0\u1EDDng b\u1ED9 t\u1EEB TP.HCM, xe gi\u01B0\u1EDDng n\u1EB1m ho\u1EB7c limousine theo Qu\u1ED1c l\u1ED9 14 m\u1EA5t kho\u1EA3ng 7\u20138 ti\u1EBFng (gi\xE1 v\xE9 tham kh\u1EA3o 280.000\u0111\u2013450.000\u0111/chi\u1EC1u).";
    return tavilyRef ? `${baseAirportInfo} ${tavilyRef}` : baseAirportInfo;
  }
  const isLogisticsQuery = /(xe may|mo to|o to|tu lai|xe rieng|xe buyt|shuttle|thue xe|phuong tien|giay to|bang lai|motorbike|scooter|car rental|transport)/i.test(
    folded
  );
  if (isLogisticsQuery && ctx.logistics.length > 0) {
    const matchedTransport = ctx.logistics.find(
      (l) => /xe may|mo to|motorbike|scooter/i.test(folded) && l.mode === "motorbike" || /tu lai|self/i.test(folded) && l.mode === "self_drive_car" || /xe rieng|tai xe|7 cho|private/i.test(folded) && l.mode === "private_car_driver" || /xe buyt|shuttle|bus/i.test(folded) && l.mode === "local_bus_shuttle"
    );
    const asksDocuments = /(giay to|thu tuc|bang lai|cccd|cmnd|ho chieu|dat coc|document|license|deposit|id card)/i.test(
      folded
    );
    if (matchedTransport && asksDocuments) {
      const rate = isEn ? `${matchedTransport.dailyRateVnd.toLocaleString("en-US")} VND/day` : `${matchedTransport.dailyRateVnd.toLocaleString("vi-VN")}\u0111/ng\xE0y`;
      return isEn ? `For **${matchedTransport.label}** (reference rate ~${rate} \u2014 ${matchedTransport.notes}), our dataset does not store per-shop rental paperwork policies, so please confirm directly with the provider. Typically in Bu\xF4n Ma Thu\u1ED9t you will need a valid ID/passport (CCCD/Passport), an appropriate driver's license (A1/A for motorbikes or B1/B2 for self-drive cars), and a refundable deposit depending on the shop.${tavilyRef ? ` ${tavilyRef}` : ""}` : `V\u1EDBi d\u1ECBch v\u1EE5 **${matchedTransport.label}** (m\u1EE9c gi\xE1 tham kh\u1EA3o ~${rate} \u2014 ${matchedTransport.notes}), d\u1EEF li\u1EC7u h\u1EC7 th\u1ED1ng hi\u1EC7n kh\xF4ng l\u01B0u quy \u0111\u1ECBnh gi\u1EA5y t\u1EDD ri\xEAng c\u1EE7a t\u1EEBng c\u1EEDa h\xE0ng n\xEAn b\u1EA1n n\xEAn x\xE1c nh\u1EADn tr\u1EF1c ti\u1EBFp khi \u0111\u1EB7t. Th\xF4ng th\u01B0\u1EDDng t\u1EA1i Bu\xF4n Ma Thu\u1ED9t, b\u1EA1n c\u1EA7n chu\u1EA9n b\u1ECB **CCCD/CMND ho\u1EB7c h\u1ED9 chi\u1EBFu**, **gi\u1EA5y ph\xE9p l\xE1i xe h\u1EE3p l\u1EC7** (h\u1EA1ng A1/A v\u1EDBi xe m\xE1y ho\u1EB7c B1/B2 v\u1EDBi \xF4 t\xF4 t\u1EF1 l\xE1i) v\xE0 **ti\u1EC1n c\u1ECDc** t\xF9y ch\xEDnh s\xE1ch t\u1EEBng \u0111i\u1EC3m thu\xEA.${tavilyRef ? ` ${tavilyRef}` : ""}`;
    }
    if (matchedTransport) {
      const rate = isEn ? `${matchedTransport.dailyRateVnd.toLocaleString("en-US")} VND/day` : `${matchedTransport.dailyRateVnd.toLocaleString("vi-VN")}\u0111/ng\xE0y`;
      return isEn ? `**${matchedTransport.label}** (${matchedTransport.tier} tier, ${matchedTransport.capacityMin}\u2013${matchedTransport.capacityMax} guests): reference rate **${rate}**. Notes: ${matchedTransport.notes}${tavilyRef ? ` ${tavilyRef}` : ""}` : `**${matchedTransport.label}** (h\u1EA1ng ${matchedTransport.tier}, ph\xF9 h\u1EE3p ${matchedTransport.capacityMin}\u2013${matchedTransport.capacityMax} kh\xE1ch): gi\xE1 tham kh\u1EA3o **${rate}**. Ghi ch\xFA: ${matchedTransport.notes}${tavilyRef ? ` ${tavilyRef}` : ""}`;
    }
    const summary = ctx.logistics.map(
      (l) => isEn ? `${l.label} (~${l.dailyRateVnd.toLocaleString("en-US")} VND/day)` : `**${l.label}** (~${l.dailyRateVnd.toLocaleString("vi-VN")}\u0111/ng\xE0y: ${l.notes})`
    ).join("; ");
    return isEn ? `Transport options in our \u0110\u1EAFk L\u1EAFk dataset: ${summary}.${tavilyRef ? ` ${tavilyRef}` : ""}` : `C\xE1c ph\u01B0\u01A1ng \xE1n di chuy\u1EC3n tham kh\u1EA3o t\u1EA1i \u0110\u1EAFk L\u1EAFk: ${summary}.${tavilyRef ? ` ${tavilyRef}` : ""}`;
  }
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const season = resolveSeasonFromDates(
    req.message,
    req.history?.map((h) => h.user).join(" ")
  );
  const asksSeasonOrWeather = /(mùa|thời tiết|khí hậu|dự báo|mưa|nắng|mặc gì|hoa cà phê|dã quỳ|tháng\s*\d+|season|weather|forecast|wear|pack|blossom)/i.test(
    lower
  );
  if (dayMatch && days.length > 0) {
    const idx = Math.max(0, Math.min(days.length - 1, Number(dayMatch[1]) - 1));
    const targetDay = days[idx];
    if (targetDay) {
      const dirMap = new Map(ctx.places.map((p) => [p.title.toLowerCase(), p]));
      const slotList = targetDay.slots.map((s) => {
        const meta = dirMap.get(s.title.toLowerCase());
        return `${s.time}: ${s.title}${meta ? ` (${meta.duration})` : ""}`;
      }).join("; ");
      const dayText = isEn ? `${targetDay.day} (${targetDay.title}) has ${targetDay.slots.length} stops: ${slotList}.` : `${targetDay.day} (${targetDay.title}) hi\u1EC7n c\xF3 ${targetDay.slots.length} \u0111i\u1EC3m: ${slotList}.`;
      if (asksSeasonOrWeather) {
        const seasonText = isEn ? ` Seasonal context (${season.milestone} \u2014 ${season.headline}): ${season.description}` : ` B\u1ED1i c\u1EA3nh m\xF9a (${season.milestone} \u2014 ${season.headline}): ${season.description}`;
        return `${dayText}${seasonText}${tavilyRef ? ` ${tavilyRef}` : ""}`;
      }
      return dayText;
    }
  }
  const asksFestivalOrEvent = /(le hoi|festival|su kien|bieu dien|chuong trinh|lich to chuc)/i.test(
    folded
  );
  const matchedPlace = findMatchedPlaceInText(folded, ctx.places);
  if (matchedPlace && !asksSeasonOrWeather && !asksFestivalOrEvent) {
    const ticketStr = matchedPlace.ticketVnd === 0 ? isEn ? "Free admission" : "Mi\u1EC5n ph\xED v\xE9 v\xE0o c\u1ED5ng" : isEn ? `${matchedPlace.ticketVnd.toLocaleString("en-US")} VND` : `${matchedPlace.ticketVnd.toLocaleString("vi-VN")}\u0111`;
    const spendStr = isEn ? `${matchedPlace.estimatedSpendVnd.toLocaleString("en-US")} VND` : `${matchedPlace.estimatedSpendVnd.toLocaleString("vi-VN")}\u0111`;
    return isEn ? `**${matchedPlace.title}** (${matchedPlace.category} \u2022 ${matchedPlace.location})
- **Suggested window:** ${matchedPlace.time} (${matchedPlace.duration})
- **Estimated cost:** ${ticketStr}, total spend ~${spendStr}${matchedPlace.priceNote ? ` (${matchedPlace.priceNote})` : ""}
- **Highlights:** ${matchedPlace.desc}${tavilyRef}` : `**${matchedPlace.title}** (${matchedPlace.category} \u2022 ${matchedPlace.location})
- **Khung gi\u1EDD g\u1EE3i \xFD:** ${matchedPlace.time} (th\u1EDDi l\u01B0\u1EE3ng ${matchedPlace.duration})
- **Chi ph\xED tham kh\u1EA3o:** ${ticketStr}, t\u1ED5ng chi ti\xEAu \u01B0\u1EDBc t\xEDnh ~${spendStr}${matchedPlace.priceNote ? ` (${matchedPlace.priceNote})` : ""}
- **\u0110i\u1EC3m n\u1ED5i b\u1EADt:** ${matchedPlace.desc}${tavilyRef}`;
  }
  if (asksSeasonOrWeather) {
    const coffeeBlossomNote = /hoa ca phe|coffee blossom/i.test(folded) ? isEn ? " Best spots to see coffee blossoms: N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n, L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn, and Bu\xF4n c\u1ED5 Ako Dh\xF4ng." : " C\xE1c \u0111i\u1EC3m g\u1EE3i \xFD ng\u1EAFm hoa c\xE0 ph\xEA v\xE0 th\u01B0\u1EDFng th\u1EE9c c\xE0 ph\xEA: N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n, L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn, B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA v\xE0 Bu\xF4n c\u1ED5 Ako Dh\xF4ng." : "";
    if (days.length > 0) {
      const totalStops = days.reduce((s, d) => s + d.slots.length, 0);
      return isEn ? `For ${season.milestone} (${season.headline} \u2014 ${season.subheadline}): ${season.description} Your current ${days.length}-day itinerary includes ${totalStops} stops across ${days.map((d) => d.title).join(" \u2192 ")}.${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ""}` : `Theo d\u1EEF li\u1EC7u m\xF9a ${season.milestone} (${season.headline} \u2014 ${season.subheadline}): ${season.description} L\u1ECBch tr\xECnh ${days.length} ng\xE0y hi\u1EC7n t\u1EA1i c\u1EE7a b\u1EA1n c\xF3 ${totalStops} \u0111i\u1EC3m d\u1EEBng, ph\xF9 h\u1EE3p chu\u1EA9n b\u1ECB gi\xE0y \u0111i b\u1ED9 tho\u1EA3i m\xE1i v\xE0 \xE1o kho\xE1c nh\u1EB9 cho bu\u1ED5i t\u1ED1i cao nguy\xEAn.${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ""}`;
    }
    return isEn ? `**${season.milestone} (${season.headline})**: ${season.subheadline}. ${season.description}${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ""}` : `**${season.milestone} (${season.headline})**: ${season.subheadline}. ${season.description}${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ""}`;
  }
  if (/(an gi|mon gi|am thuc|dac san|bun|com lam|ga nuong|ca lang|banh uot|mua qua|qua gi|quan an|nha hang|food|eat|cuisine|souvenir|specialty)/i.test(
    folded
  )) {
    const foodBase = isEn ? "Must-try \u0110\u1EAFk L\u1EAFk specialties include Bu\xF4n Ma Thu\u1ED9t red noodle soup (b\xFAn \u0111\u1ECF), stacked wet rice pancakes with grilled pork (b\xE1nh \u01B0\u1EDBt th\u1ECBt n\u01B0\u1EDBng), grilled chicken with bamboo rice (g\xE0 n\u01B0\u1EDBng c\u01A1m lam), S\xEAr\xEAp\u1ED1k l\u0103ng fish, and hand-brewed Fine Robusta around Phan \u0110\xECnh Gi\xF3t street. For gifts/souvenirs, look for specialty roasted coffee, \u0110\u1EAFk L\u1EAFk cocoa powder, macadamia nuts, and coffee-blossom honey." : "\u0110\u1EBFn \u0110\u1EAFk L\u1EAFk b\u1EA1n nh\u1EA5t \u0111\u1ECBnh n\xEAn th\u1EED b\xFAn \u0111\u1ECF Ban M\xEA, b\xE1nh \u01B0\u1EDBt th\u1ECBt n\u01B0\u1EDBng ch\u1ED3ng \u0111\u0129a, g\xE0 n\u01B0\u1EDBng c\u01A1m lam B\u1EA3n \u0110\xF4n/H\u1ED3 L\u1EAFk, c\xE1 l\u0103ng s\xF4ng S\xEAr\xEAp\u1ED1k v\xE0 th\u01B0\u1EDFng th\u1EE9c Fine Robusta \u1EDF Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t ho\u1EB7c B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA. N\u1EBFu mua qu\xE0 mang v\u1EC1, b\u1EA1n c\xF3 th\u1EC3 ch\u1ECDn c\xE0 ph\xEA h\u1EA1t/rang m\u1ED9c \u0111\u1EB7c s\u1EA3n, b\u1ED9t ca cao \u0110\u1EAFk L\u1EAFk, h\u1EA1t m\u1EAFc ca v\xE0 m\u1EADt ong hoa c\xE0 ph\xEA.";
    return tavilyRef ? `${foodBase} ${tavilyRef}` : foodBase;
  }
  if (/(le hoi cong chieng|cong chieng.*le hoi|le hoi.*cong chieng|le hoi.*ako dhong)/i.test(folded)) {
    const gongFestBase = isEn ? `**Gong Culture & Community Performances in \u0110\u1EAFk L\u1EAFk**
- **Status:** Our local dataset does not have a confirmed public schedule for a one-off Gong Festival on a specific date unless verified by official provincial announcements.
- **Regular experiences:** Cultural gong performances (UNESCO Intangible Cultural Heritage) are periodically hosted at community tourism villages like **Bu\xF4n c\u1ED5 Ako Dh\xF4ng** (Bu\xF4n Ma Thu\u1ED9t) and cultural centers by local artisans or tour groups.` : `**L\u1EC5 h\u1ED9i & Bi\u1EC3u di\u1EC5n V\u0103n h\xF3a C\u1ED3ng chi\xEAng t\u1EA1i Bu\xF4n c\u1ED5 Ako Dh\xF4ng**
- **V\u1EC1 l\u1ECBch t\u1ED5 ch\u1EE9c c\u1EE5 th\u1EC3:** D\u1EEF li\u1EC7u hi\u1EC7n t\u1EA1i ch\u01B0a ghi nh\u1EADn th\xF4ng b\xE1o l\u1ECBch ch\xEDnh th\u1EE9c c\u1EE7a m\u1ED9t s\u1EF1 ki\u1EC7n L\u1EC5 h\u1ED9i C\u1ED3ng chi\xEAng c\u1EA5p t\u1EC9nh di\u1EC5n ra \u0111\xFAng v\xE0o ng\xE0y c\u1EE5 th\u1EC3 b\u1EA1n h\u1ECFi; b\u1EA1n n\xEAn ki\u1EC3m tra th\xEAm th\xF4ng b\xE1o t\u1EEB S\u1EDF V\u0103n h\xF3a, Th\u1EC3 thao & Du l\u1ECBch \u0110\u1EAFk L\u1EAFk.
- **Tr\u1EA3i nghi\u1EC7m th\u01B0\u1EDDng k\u1EF3:** T\u1EA1i **Bu\xF4n c\u1ED5 Ako Dh\xF4ng** (c\xE1ch trung t\xE2m Bu\xF4n Ma Thu\u1ED9t ~2 km), c\xE1c ch\u01B0\u01A1ng tr\xECnh giao l\u01B0u v\u0103n h\xF3a c\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn, tham quan nh\xE0 d\xE0i \xCA \u0110\xEA v\xE0 th\u01B0\u1EDFng th\u1EE9c \u1EA9m th\u1EF1c b\u1EA3n \u0111\u1ECBa v\u1EABn \u0111\u01B0\u1EE3c t\u1ED5 ch\u1EE9c theo l\u1ECBch bi\u1EC3u di\u1EC5n \u0111\u1ECBnh k\u1EF3 ho\u1EB7c \u0111\u1EB7t tr\u01B0\u1EDBc theo \u0111o\xE0n.`;
    return tavilyRef ? `${gongFestBase}${tavilyRef}` : gongFestBase;
  }
  if (/(le hoi ca phe|coffee festival|le hoi)/i.test(folded)) {
    const festBase = isEn ? "**Bu\xF4n Ma Thu\u1ED9t Coffee Festival & Local Events**\n- Held biennially in March as Vietnam\u2019s largest coffee cultural event featuring street parades, free coffee tasting, specialty brewing competitions, and Central Highlands gong performances." : "**L\u1EC5 h\u1ED9i C\xE0 ph\xEA Bu\xF4n Ma Thu\u1ED9t & S\u1EF1 ki\u1EC7n V\u0103n h\xF3a**\n- **Th\u1EDDi gian th\u01B0\u1EDDng l\u1EC7:** T\u1ED5 ch\u1EE9c \u0111\u1ECBnh k\u1EF3 2 n\u0103m m\u1ED9t l\u1EA7n v\xE0o th\xE1ng 3 t\u1EA1i TP. Bu\xF4n Ma Thu\u1ED9t.\n- **Ho\u1EA1t \u0111\u1ED9ng n\u1ED5i b\u1EADt:** L\u1EC5 h\u1ED9i \u0111\u01B0\u1EDDng ph\u1ED1, th\u01B0\u1EDFng th\u1EE9c c\xE0 ph\xEA mi\u1EC5n ph\xED, h\u1ED9i thi pha ch\u1EBF Fine Robusta v\xE0 kh\xF4ng gian bi\u1EC3u di\u1EC5n c\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn.";
    return tavilyRef ? `${festBase}${tavilyRef}` : festBase;
  }
  if (/(kotam|ko tam|khai doan|sac tu khai doan|chu yang sin|ho ea kao)/i.test(folded)) {
    const extLandmarkBase = isEn ? "Notable destinations around Bu\xF4n Ma Thu\u1ED9t include S\u1EAFc T\u1EE9 Kh\u1EA3i \u0110oan Pagoda (the largest historic royal-titled pagoda in \u0110\u1EAFk L\u1EAFk on Phan B\u1ED9i Ch\xE2u Street), KoTam Community Eco-Tourism Area (on National Highway 26, ~8 km from BMT center with gardens, bamboo architecture, and local cuisine), Ea Kao Lake (~12 km south of BMT center), and Ch\u01B0 Yang Sin National Park (renowned for cloud-forest trekking and biodiversity)." : "C\xE1c \u0111i\u1EC3m tham quan n\u1ED5i ti\u1EBFng quanh Bu\xF4n Ma Thu\u1ED9t g\u1ED3m Ch\xF9a S\u1EAFc T\u1EE9 Kh\u1EA3i \u0110oan (ng\xF4i ch\xF9a l\u1EDBn v\xE0 c\u1ED5 k\xEDnh nh\u1EA5t \u0110\u1EAFk L\u1EAFk tr\xEAn \u0111\u01B0\u1EDDng Phan B\u1ED9i Ch\xE2u), Khu du l\u1ECBch sinh th\xE1i c\u1ED9ng \u0111\u1ED3ng KoTam (tr\xEAn Qu\u1ED1c l\u1ED9 26, c\xE1ch trung t\xE2m ~8 km v\u1EDBi v\u01B0\u1EDDn hoa, b\u1EBFn n\u01B0\u1EDBc v\xE0 \u1EA9m th\u1EF1c T\xE2y Nguy\xEAn), H\u1ED3 Ea Kao (c\xE1ch trung t\xE2m ~12 km v\u1EC1 ph\xEDa Nam) v\xE0 V\u01B0\u1EDDn Qu\u1ED1c gia Ch\u01B0 Yang Sin (\u0111i\u1EC3m trekking r\u1EEBng nguy\xEAn sinh n\u1ED5i ti\u1EBFng).";
    return tavilyRef ? `${extLandmarkBase} ${tavilyRef}` : extLandmarkBase;
  }
  if (/(van hoa|cong chieng|dan toc|e de|m'nong|mnong|nha dai|mau he|lich su|history|culture|gong)/i.test(folded)) {
    const cultureBase = isEn ? "\u0110\u1EAFk L\u1EAFk is home to 49 ethnic groups, notably the indigenous \xCA \u0110\xEA (known for matriarchal longhouses, Kpan benches, and epic Khan storytelling in villages like Ako Dh\xF4ng) and M\u2019n\xF4ng communities around L\u1EAFk Lake and Bu\xF4n \u0110\xF4n. The Space of Gong Culture in the Central Highlands is recognized by UNESCO as an Intangible Cultural Heritage of Humanity." : "\u0110\u1EAFk L\u1EAFk l\xE0 n\u01A1i h\u1ED9i t\u1EE5 c\u1EE7a 49 d\xE2n t\u1ED9c anh em, ti\xEAu bi\u1EC3u l\xE0 ng\u01B0\u1EDDi \xCA \u0110\xEA (v\u1EDBi truy\u1EC1n th\u1ED1ng m\u1EABu h\u1EC7, ki\u1EBFn tr\xFAc nh\xE0 d\xE0i, gh\u1EBF Kpan v\xE0 s\u1EED thi \u0110am San t\u1EA1i c\xE1c bu\xF4n c\u1ED5 nh\u01B0 Ako Dh\xF4ng) c\xF9ng ng\u01B0\u1EDDi M\u2019n\xF4ng v\xF9ng H\u1ED3 L\u1EAFk \u2013 Bu\xF4n \u0110\xF4n. Kh\xF4ng gian v\u0103n h\xF3a C\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn \u0111\xE3 \u0111\u01B0\u1EE3c UNESCO c\xF4ng nh\u1EADn l\xE0 Di s\u1EA3n V\u0103n h\xF3a Phi v\u1EADt th\u1EC3 \u0110\u1EA1i di\u1EC7n c\u1EE7a Nh\xE2n lo\u1EA1i.";
    return tavilyRef ? `${cultureBase} ${tavilyRef}` : cultureBase;
  }
  if (tavilyRef) {
    return tavilyRef.trim();
  }
  const validSnippets = (options?.tavilySnippets || []).filter(
    (s) => typeof s?.content === "string" && s.content.trim().length > 0
  );
  if (validSnippets.length > 0) {
    const matchingLangSnippets = isEn ? validSnippets : validSnippets.filter((s) => !isLikelyEnglishText(s.content));
    const chosen = matchingLangSnippets.length > 0 ? matchingLangSnippets : validSnippets;
    if (isEn) {
      return chosen.slice(0, 2).map((s) => `- **${s.title}**: ${s.content}`).join("\n");
    }
    if (matchingLangSnippets.length > 0) {
      return `**Th\xF4ng tin tham kh\u1EA3o tr\u1EF1c tuy\u1EBFn:**
${matchingLangSnippets.slice(0, 2).map((s) => `- **${s.title}**: ${s.content}`).join("\n")}`;
    }
    return "H\u1EC7 th\u1ED1ng \u0111\xE3 t\xECm th\u1EA5y m\u1ED9t s\u1ED1 b\xE0i vi\u1EBFt tham kh\u1EA3o tr\u1EF1c tuy\u1EBFn (chi ti\u1EBFt ngu\u1ED3n \u0111\xEDnh k\xE8m b\xEAn d\u01B0\u1EDBi). B\u1EA1n c\xF3 th\u1EC3 m\u1EDF li\xEAn k\u1EBFt ngu\u1ED3n ho\u1EB7c h\u1ECFi c\u1EE5 th\u1EC3 h\u01A1n \u0111\u1EC3 m\xECnh t\u1ED5ng h\u1EE3p gi\xFAp b\u1EA1n nh\xE9!";
  }
  if (days.length > 0) {
    const totalStops = days.reduce((s, d) => s + d.slots.length, 0);
    const itinerarySummary = days.map(
      (d, i) => `${isEn ? `Day ${i + 1}` : `Ng\xE0y ${i + 1}`}: ${d.slots.map((s) => `${s.title} (${s.time})`).join(", ")}`
    ).join(" | ");
    return isEn ? `Your current ${req.currentState.duration} itinerary (${totalStops} stops total): ${itinerarySummary}. Seasonal context (${season.milestone}): ${season.subheadline}.` : `L\u1ECBch tr\xECnh ${req.currentState.duration} hi\u1EC7n t\u1EA1i c\u1EE7a b\u1EA1n g\u1ED3m ${totalStops} \u0111i\u1EC3m d\u1EEBng: ${itinerarySummary}. B\u1ED1i c\u1EA3nh m\xF9a (${season.milestone}): ${season.subheadline}.`;
  }
  return isEn ? "\u0110\u1EAFk L\u1EAFk highlights include B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, Bu\xF4n c\u1ED5 Ako Dh\xF4ng, H\u1ED3 L\u1EAFk & Bu\xF4n Jun, Th\xE1c Dray Nur H\xF9ng V\u0129, and ethical elephant walks in V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n. Tell me your trip duration and style if you want a tailored itinerary!" : "C\xE1c \u0111i\u1EC3m n\u1ED5i b\u1EADt nh\u1EA5t t\u1EA1i \u0110\u1EAFk L\u1EAFk g\u1ED3m B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, Bu\xF4n c\u1ED5 Ako Dh\xF4ng, H\u1ED3 L\u1EAFk & Bu\xF4n Jun, Th\xE1c Dray Nur H\xF9ng V\u0129 v\xE0 tr\u1EA3i nghi\u1EC7m \u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn \u1EDF V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n. B\u1EA1n c\xF3 th\u1EC3 cho m\xECnh bi\u1EBFt s\u1ED1 ng\xE0y & s\u1EDF th\xEDch \u0111\u1EC3 m\xECnh thi\u1EBFt k\u1EBF l\u1ECBch tr\xECnh ri\xEAng nh\xE9!";
}
function detectIntentDeterministic(req) {
  const lower = req.message.toLowerCase();
  const hasModifyVerb = /(thêm|bỏ|xóa|bớt|đổi điểm|thay điểm|add|remove|drop|swap|replace)/i.test(lower);
  const hasFullPlanVerb = /(lên lịch|lịch trình mới|thiết kế|tạo tour|lập kế hoạch|kế hoạch chuyến|plan a trip|create itinerary|new itinerary|build.*itinerary)/i.test(
    lower
  );
  const looksLikeTripPlanGoal = !isPrimaryAmenityOrInfoQuestion(lower) && (/(lên lịch|lịch trình|kế hoạch|plan.*trip|itinerary|muốn đi.*chơi|tư vấn.*lịch)/i.test(lower) || /(muốn đi|tư vấn.*đi)/i.test(lower) && !isQuestionOrInfoRequest(lower));
  if (req.isFollowUp && req.currentState.days.length > 0 && hasModifyVerb && !hasFullPlanVerb && !isPrimaryAmenityOrInfoQuestion(lower)) {
    return "modify_stops";
  }
  const looksLikeGeneralQa = !hasFullPlanVerb && (!hasModifyVerb || isPrimaryAmenityOrInfoQuestion(lower)) && !looksLikeTripPlanGoal && (isPrimaryAmenityOrInfoQuestion(lower) || isQuestionOrInfoRequest(lower) || /(mùa nào|thời tiết|bao giờ|tháng mấy|ở đâu|ăn gì|món gì|đặc sản|giá vé|bao xa|di chuyển|cách đi|có nên|lễ hội|văn hóa|lịch sử|sân bay|xe khách|what|when|where|which|how|weather|season|best time|tell me about)/i.test(
    lower
  ));
  if (looksLikeGeneralQa) {
    return "general_qa";
  }
  return "plan_trip";
}
function runPhase1IntakeDeterministic(req) {
  const draft = req.draftIntake;
  const recentUserHistory = Array.isArray(req.history) ? req.history.slice(-2).map((h) => h.user).join(" ") : "";
  const hasDraft = Boolean(draft && Object.keys(draft).length > 0);
  const parseSourceText = hasDraft ? normalizeText(req.message) : [recentUserHistory, req.message].filter(Boolean).join(" ").trim();
  const msgTravelers = extractTravelersFromText(parseSourceText);
  const hasExplicitCompanionKeyword = /(độc hành|một mình|1 mình|đi riêng|solo|gia đình|bố mẹ|trẻ nhỏ|con nhỏ|ông bà|family|kids|children|nhóm bạn|bạn bè|hội bạn|team|friends|group|cặp đôi|người yêu|vợ chồng|lãng mạn|honeymoon|couple)/i.test(
    parseSourceText
  );
  const draftCompanion = draft?.companionType && VALID_COMPANIONS.includes(draft.companionType) ? draft.companionType : null;
  const companionType = hasExplicitCompanionKeyword ? msgTravelers.companionType : draftCompanion ?? msgTravelers.companionType;
  const draftCount = typeof draft?.travelersCount === "number" && Number.isFinite(draft.travelersCount) && draft.travelersCount >= 1 ? Math.round(draft.travelersCount) : null;
  const travelersCount = msgTravelers.travelersCount ?? draftCount ?? inferTravelersCountFromCompanion(companionType);
  const msgBudget = extractBudgetVndFromText(parseSourceText, travelersCount);
  const msgDates = extractDatesAndDurationFromText(parseSourceText);
  const draftMainPurpose = draft?.mainPurpose && VALID_THEMES.includes(draft.mainPurpose) ? draft.mainPurpose : null;
  const msgPurpose = extractPurposeFromText(
    parseSourceText,
    draftMainPurpose || req.currentState.theme
  );
  const draftMissing = Array.isArray(draft?.missingFields) ? draft.missingFields : null;
  const draftHasBudget = Boolean(
    draft && (typeof draft.totalBudgetVnd === "number" && Number.isFinite(draft.totalBudgetVnd) && draft.totalBudgetVnd >= 3e5 || (draftMissing ? !draftMissing.includes("budget") : Boolean(draft.budgetTier && VALID_BUDGETS.includes(draft.budgetTier))))
  );
  const draftHasDates = Boolean(
    draft && (draftMissing ? !draftMissing.includes("dates") : Boolean(
      typeof draft.travelDates === "string" && draft.travelDates.trim() || draft.duration && VALID_DURATIONS.includes(draft.duration)
    ))
  );
  const draftHasTravelers = Boolean(
    draft && ((draftMissing ? !draftMissing.includes("travelers") : false) || draftCount !== null || draftCompanion !== null)
  );
  const hasBudgetInfo = msgBudget.explicitMention || draftHasBudget;
  const hasDatesInfo = msgDates.explicitMention || draftHasDates;
  const hasTravelersInfo = msgTravelers.explicitMention || draftHasTravelers || travelersCount !== null || companionType !== null;
  let intent = detectIntentDeterministic(req);
  const isDirectQuestionWhileClarifying = Boolean(draft?.needsClarification) && isPrimaryAmenityOrInfoQuestion(req.message) && !/(lên lịch|lập kế hoạch|thiết kế lịch|tạo lịch|tạo tour|plan.*trip|create itinerary|build.*itinerary)/i.test(
    req.message
  );
  if (draft?.needsClarification && !isDirectQuestionWhileClarifying && (msgBudget.explicitMention || msgDates.explicitMention || msgTravelers.explicitMention)) {
    intent = "plan_trip";
  }
  const isKnownPreset = sampleSchedulePresets.some(
    (p) => p.prompt.trim().toLowerCase() === req.message.trim().toLowerCase()
  );
  const missingFields = [];
  if (intent === "plan_trip" && !isKnownPreset) {
    const hasActivePlanner = req.isFollowUp && req.currentState.days.length > 0;
    if (!hasActivePlanner) {
      if (!hasBudgetInfo) missingFields.push("budget");
      if (!hasDatesInfo) missingFields.push("dates");
      if (!hasTravelersInfo) missingFields.push("travelers");
    }
  }
  const needsClarification = intent === "plan_trip" && missingFields.length > 0;
  const draftDuration = draft?.duration && VALID_DURATIONS.includes(draft.duration) ? draft.duration : null;
  const duration = msgDates.duration || draftDuration || req.currentState.duration || "3N2D";
  const draftBudgetVnd = typeof draft?.totalBudgetVnd === "number" && Number.isFinite(draft.totalBudgetVnd) && draft.totalBudgetVnd >= 3e5 ? Math.round(draft.totalBudgetVnd) : null;
  const totalBudgetVnd = msgBudget.totalBudgetVnd ?? draftBudgetVnd;
  const draftBudgetTier = draft?.budgetTier && VALID_BUDGETS.includes(draft.budgetTier) && draftHasBudget ? draft.budgetTier : null;
  const budgetTier = msgBudget.budgetTier || draftBudgetTier || req.currentState.budget || "standard";
  const draftTravelDates = draftHasDates && typeof draft?.travelDates === "string" && draft.travelDates.trim() ? draft.travelDates.trim() : null;
  let travelDates = null;
  if (draftTravelDates && msgDates.travelDates) {
    const mergedHints = Array.from(
      /* @__PURE__ */ new Set([
        ...draftTravelDates.split("\u2022").map((s) => s.trim()).filter(Boolean),
        ...msgDates.travelDates.split("\u2022").map((s) => s.trim()).filter(Boolean)
      ])
    );
    travelDates = mergedHints.join(" \u2022 ");
  } else {
    travelDates = msgDates.travelDates || draftTravelDates || duration;
  }
  const draftInterests = Array.isArray(draft?.secondaryInterests) ? draft.secondaryInterests.map((s) => String(s).trim()).filter(Boolean) : [];
  const secondaryInterests = Array.from(
    /* @__PURE__ */ new Set([...draftInterests, ...msgPurpose.secondaryInterests])
  );
  const rawUserGoal = draft?.rawUserGoal && draft.rawUserGoal.trim() && draft.rawUserGoal.trim() !== normalizeText(req.message) ? `${draft.rawUserGoal.trim()} \u2014 ${normalizeText(req.message)}` : normalizeText(req.message);
  const intake = {
    intent,
    travelersCount,
    companionType,
    travelDates,
    duration,
    totalBudgetVnd,
    budgetTier,
    mainPurpose: msgPurpose.mainPurpose,
    secondaryInterests,
    missingFields,
    needsClarification,
    clarificationQuestion: needsClarification ? buildClarificationQuestion(req.lang, missingFields) : void 0,
    rawUserGoal
  };
  return {
    intake,
    stopOperations: [],
    provider: "local-fallback"
  };
}
var PHASE1_INTAKE_SCHEMA = {
  type: "OBJECT",
  properties: {
    intent: { type: "STRING", enum: ["general_qa", "plan_trip", "modify_stops"] },
    travelersCount: { type: "INTEGER", nullable: true },
    companionType: {
      type: "STRING",
      enum: ["solo", "couple", "family", "friends"],
      nullable: true
    },
    travelDates: { type: "STRING", nullable: true },
    duration: { type: "STRING", enum: ["2N1D", "3N2D", "4N3D+"] },
    totalBudgetVnd: { type: "INTEGER", nullable: true },
    budgetTier: { type: "STRING", enum: ["budget", "standard", "luxury"] },
    mainPurpose: { type: "STRING", enum: ["coffee", "culture", "nature", "cuisine"] },
    secondaryInterests: { type: "ARRAY", items: { type: "STRING" } },
    hasBudgetInfo: { type: "BOOLEAN" },
    hasDatesInfo: { type: "BOOLEAN" },
    hasTravelersInfo: { type: "BOOLEAN" },
    clarificationQuestion: { type: "STRING", nullable: true },
    generalQaReply: { type: "STRING", nullable: true },
    stopOperations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          action: { type: "STRING", enum: ["add", "remove"] },
          placeTitle: { type: "STRING" },
          dayNumber: { type: "INTEGER" },
          time: { type: "STRING" },
          period: { type: "STRING" }
        },
        required: ["action", "placeTitle"]
      }
    }
  },
  required: [
    "intent",
    "duration",
    "budgetTier",
    "mainPurpose",
    "secondaryInterests",
    "hasBudgetInfo",
    "hasDatesInfo",
    "hasTravelersInfo"
  ]
};
async function runPhase1Intake(req, options) {
  return withOpenInferenceSpan(
    "phase1_intake",
    {
      kind: OpenInferenceSpanKind3.CHAIN,
      input: {
        message: req.message,
        lang: req.lang,
        isFollowUp: req.isFollowUp,
        currentState: req.currentState
      },
      formatOutput: (out) => ({
        intent: out.intake.intent,
        needsClarification: out.intake.needsClarification,
        missingFields: out.intake.missingFields,
        provider: out.provider
      })
    },
    async () => {
      const deterministic = runPhase1IntakeDeterministic(req);
      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return deterministic;
      }
      const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const shouldInjectQaContext = deterministic.intake.intent === "general_qa" || isQuestionOrInfoRequest(req.message) || isPrimaryAmenityOrInfoQuestion(req.message);
      const groundedQaCtx = shouldInjectQaContext ? await loadGroundedQaContext() : null;
      const tavilyQaCtx = shouldInjectQaContext ? await maybeFetchTavilyQaContext(req.message, {
        enableTavily: options?.enableTavily,
        tavilyClient: options?.tavilyClient
      }) : { snippets: [], citations: [] };
      const effectiveQaLang = resolveEffectiveQaLanguage(req.message, req.lang);
      const systemText = [
        'You are Phase 1 Intake Classifier & Extractor for "\u0110\u1EAFk L\u1EAFk AI Travel Concierge".',
        `UI language: "${req.lang}". Target Q&A reply language: "${effectiveQaLang}".`,
        "Classify intent into:",
        '- "general_qa": user asks a question (?, "c\xF3 ... kh\xF4ng", "bao nhi\xEAu", "\u1EDF \u0111\xE2u", "c\u1EA7n gi\u1EA5y t\u1EDD g\xEC", "review", "t\u01B0 v\u1EA5n", "gi\u1EDBi thi\u1EC7u") about stays/homestays/resorts & amenities/prices, transport/flights/buses/rental requirements, places, external landmarks, seasons, weather, culture, festivals, dishes, or travel tips without requesting a full trip plan or explicit itinerary edit.',
        '- "modify_stops": user wants to add/remove/swap specific stops in an existing itinerary (only when currentItinerary has days and the message is an explicit stop edit command, NOT primarily an info/amenity question).',
        '- "plan_trip": user wants a trip itinerary planned, advised for a multi-day trip ("mu\u1ED1n \u0111i ... ch\u01A1i v\xE0i ng\xE0y", "l\xEAn l\u1ECBch tr\xECnh"), or regenerated.',
        "Extract travelersCount, companionType, travelDates, duration (2N1D/3N2D/4N3D+), totalBudgetVnd (numeric VND if stated), budgetTier, mainPurpose (coffee/culture/nature/cuisine), secondaryInterests.",
        "When draftIntake is provided, preserve all previously collected slots (companionType, travelersCount, travelDates, duration, totalBudgetVnd, budgetTier, mainPurpose, secondaryInterests) unless userMessage explicitly changes them.",
        "CRITICAL Honesty check rules (NEVER copy currentState defaults to mark these true!):",
        "- hasBudgetInfo = true ONLY if userMessage, draftIntake, or recentHistory explicitly states a budget amount or tier (budget/standard/luxury/ti\u1EBFt ki\u1EC7m/cao c\u1EA5p/tri\u1EC7u).",
        '- hasDatesInfo = true ONLY if userMessage, draftIntake, or recentHistory explicitly states trip length (e.g. 2N1D, 3 ng\xE0y \u2014 NOT vague "v\xE0i ng\xE0y") or month/dates/season.',
        '- hasTravelersInfo = true ONLY if userMessage, draftIntake, or recentHistory explicitly states traveler count or companion type (solo/couple/family/friends). First-person pronouns like "m\xECnh" or "t\xF4i" alone do NOT imply solo travel \u2014 return null for companionType and travelersCount if unstated.',
        'If intent is "general_qa", write a helpful, factual, ethical (no elephant riding) answer in "generalQaReply":',
        `- CRITICAL LANGUAGE RULE: Write 100% of "generalQaReply" in ${effectiveQaLang === "vi" ? "natural, fluent Vietnamese" : "natural, fluent English"} matching the user's message. If "tavilyLiveWebAnswer" or "tavilyLiveWebSnippets" are in English and target language is "vi", ALWAYS translate and synthesize those facts into natural Vietnamese \u2014 NEVER paste English sentences or phrases into a Vietnamese reply.`,
        '- FORMATTING RULE: Structure "generalQaReply" for easy reading using clean Markdown: start with a 1\u20132 sentence direct summary, followed by bullet points ("- **Label**: detail") for prices, schedules, amenities, or practical tips, separated by blank lines (never one dense wall of text).',
        "- Synthesize grounded local data (stays, logistics, dakLakPlaceDirectory, seasonsData) AND live web search context (tavilyLiveWebAnswer, tavilyLiveWebSnippets) when provided, supplemented by accurate \u0110\u1EAFk L\u1EAFk travel knowledge for external landmarks, transport, festivals, or general questions.",
        "- CRITICAL HONESTY FOR INTERNAL CATALOG STAYS: If asked whether a specific stay in `stays` has an amenity (e.g. swimming pool / h\u1ED3 b\u01A1i), price, or rental requirement that is NOT listed/confirmed in `stays` or `tavilyLiveWebSnippets`, honestly state that it is not listed/confirmed in our data, list its actual recorded amenities, and suggest relevant alternatives from `stays` if appropriate.",
        'If intent is "plan_trip" and any of hasBudgetInfo/hasDatesInfo/hasTravelersInfo is false, write a concise targeted question in "clarificationQuestion" asking for ALL missing details.'
      ].join("\n");
      const historySnippet = (req.history || []).slice(-4).map((h) => `User: ${h.user}
Assistant: ${h.reply}`).join("\n");
      const prompt = [
        `isFollowUp: ${req.isFollowUp}`,
        `hasExistingDays: ${req.currentState.days.length > 0}`,
        `currentState: theme=${req.currentState.theme}, duration=${req.currentState.duration}, companion=${req.currentState.companion}, budget=${req.currentState.budget}`,
        req.draftIntake ? `draftIntake: ${JSON.stringify(req.draftIntake)}` : "",
        groundedQaCtx ? `stays:
${JSON.stringify(groundedQaCtx.stays)}` : "",
        groundedQaCtx ? `logistics:
${JSON.stringify(groundedQaCtx.logistics)}` : "",
        groundedQaCtx ? `dakLakPlaceDirectory:
${JSON.stringify(groundedQaCtx.places)}` : "",
        groundedQaCtx ? `seasonsData:
${JSON.stringify(groundedQaCtx.seasons)}` : "",
        tavilyQaCtx.answer ? `tavilyLiveWebAnswer:
${tavilyQaCtx.answer}` : "",
        tavilyQaCtx.snippets.length > 0 ? `tavilyLiveWebSnippets:
${JSON.stringify(tavilyQaCtx.snippets)}` : "",
        historySnippet ? `recentHistory:
${historySnippet}` : "",
        `userMessage: ${req.message}`
      ].filter(Boolean).join("\n\n");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(15e3, AI_CHAT_TIMEOUT_MS));
      try {
        const llmCall = await withOpenInferenceSpan(
          "gemini_phase1_intake",
          {
            kind: OpenInferenceSpanKind3.LLM,
            input: prompt,
            attributes: {
              [LLM_MODEL_NAME]: model,
              [LLM_PROVIDER]: "google",
              [LLM_SYSTEM]: "gemini",
              [`${SemanticConventions2.LLM_INPUT_MESSAGES}.0.${SemanticConventions2.MESSAGE_ROLE}`]: "system",
              [`${SemanticConventions2.LLM_INPUT_MESSAGES}.0.${SemanticConventions2.MESSAGE_CONTENT}`]: systemText,
              [`${SemanticConventions2.LLM_INPUT_MESSAGES}.1.${SemanticConventions2.MESSAGE_ROLE}`]: "user",
              [`${SemanticConventions2.LLM_INPUT_MESSAGES}.1.${SemanticConventions2.MESSAGE_CONTENT}`]: prompt
            },
            formatOutput: (res) => res.rawText,
            onSuccess: (span, res) => {
              span.setAttribute(
                `${SemanticConventions2.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions2.MESSAGE_ROLE}`,
                "assistant"
              );
              span.setAttribute(
                `${SemanticConventions2.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions2.MESSAGE_CONTENT}`,
                res.rawText
              );
              if (res.usage?.promptTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_PROMPT, res.usage.promptTokenCount);
              }
              if (res.usage?.candidatesTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_COMPLETION, res.usage.candidatesTokenCount);
              }
              if (res.usage?.totalTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_TOTAL, res.usage.totalTokenCount);
              }
            }
          },
          async () => {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.15,
                  maxOutputTokens: 1024,
                  responseMimeType: "application/json",
                  responseSchema: PHASE1_INTAKE_SCHEMA
                }
              })
            });
            if (!response.ok) {
              const errBody = await response.text().catch(() => "");
              throw new Error(`Gemini Phase 1 HTTP ${response.status}: ${errBody.slice(0, 200)}`);
            }
            const data = await response.json();
            const rawText2 = (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            return { rawText: rawText2, usage: data.usageMetadata };
          }
        );
        const { rawText } = llmCall;
        if (!rawText) return deterministic;
        const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(jsonText);
        const looksLikeTripPlanGoal = !isPrimaryAmenityOrInfoQuestion(req.message) && /(muốn đi.*chơi|lên lịch|lịch trình|tư vấn.*đi|chơi.*ngày|kế hoạch|plan.*trip|itinerary)/i.test(
          req.message
        );
        const isLockedGeneralQa = deterministic.intake.intent === "general_qa" && !looksLikeTripPlanGoal && (isPrimaryAmenityOrInfoQuestion(req.message) || isQuestionOrInfoRequest(req.message));
        const intent = isLockedGeneralQa ? "general_qa" : (req.draftIntake?.needsClarification || looksLikeTripPlanGoal) && deterministic.intake.intent === "plan_trip" ? "plan_trip" : parsed.intent === "general_qa" || parsed.intent === "modify_stops" || parsed.intent === "plan_trip" ? parsed.intent : deterministic.intake.intent;
        const duration = extractDatesAndDurationFromText(req.message).duration || (VALID_DURATIONS.includes(parsed.duration) ? parsed.duration : deterministic.intake.duration);
        const msgBudgetCheck = extractBudgetVndFromText(
          req.message,
          deterministic.intake.travelersCount
        );
        const budgetTier = msgBudgetCheck.budgetTier ? msgBudgetCheck.budgetTier : VALID_BUDGETS.includes(parsed.budgetTier) && (msgBudgetCheck.explicitMention || !req.draftIntake) ? parsed.budgetTier : deterministic.intake.budgetTier;
        const msgHasPurpose = /(cà phê|coffee|robusta|cupping|văn hóa|cồng chiêng|bảo tàng|culture|thác|yok đôn|rừng|hồ lắk|nature|ẩm thực|ăn uống|món ăn|food|cuisine)/i.test(
          req.message
        );
        const mainPurpose = !msgHasPurpose && req.draftIntake?.mainPurpose ? deterministic.intake.mainPurpose : VALID_THEMES.includes(parsed.mainPurpose) ? parsed.mainPurpose : deterministic.intake.mainPurpose;
        const hasDeterministicTravelers = !deterministic.intake.missingFields.includes("travelers");
        const msgHasCompanion = /(độc hành|một mình|1 mình|đi riêng|solo|gia đình|bố mẹ|trẻ nhỏ|con nhỏ|ông bà|family|kids|children|nhóm bạn|bạn bè|hội bạn|team|friends|group|cặp đôi|người yêu|vợ chồng|lãng mạn|honeymoon|couple)/i.test(
          req.message
        );
        const companionType = !hasDeterministicTravelers ? null : !msgHasCompanion && req.draftIntake?.companionType ? deterministic.intake.companionType : VALID_COMPANIONS.includes(parsed.companionType) ? parsed.companionType : deterministic.intake.companionType;
        const rawParsedTravelers = hasDeterministicTravelers && typeof parsed.travelersCount === "number" && Number.isFinite(parsed.travelersCount) && parsed.travelersCount >= 1 ? Math.round(parsed.travelersCount) : null;
        const travelersCount = !hasDeterministicTravelers ? null : rawParsedTravelers ?? deterministic.intake.travelersCount ?? inferTravelersCountFromCompanion(companionType);
        const hasDeterministicBudget = !deterministic.intake.missingFields.includes("budget");
        const totalBudgetVnd = typeof parsed.totalBudgetVnd === "number" && Number.isFinite(parsed.totalBudgetVnd) && parsed.totalBudgetVnd >= 3e5 ? Math.round(parsed.totalBudgetVnd) : deterministic.intake.totalBudgetVnd;
        const hasDeterministicDates = !deterministic.intake.missingFields.includes("dates");
        const travelDates = !hasDeterministicDates ? deterministic.intake.travelDates : typeof parsed.travelDates === "string" && parsed.travelDates.trim() ? parsed.travelDates.trim() : deterministic.intake.travelDates;
        const parsedInterests = Array.isArray(parsed.secondaryInterests) ? parsed.secondaryInterests.map((s) => String(s).trim()).filter(Boolean) : [];
        const secondaryInterests = Array.from(
          /* @__PURE__ */ new Set([...deterministic.intake.secondaryInterests, ...parsedInterests])
        );
        const isKnownPreset = sampleSchedulePresets.some(
          (p) => p.prompt.trim().toLowerCase() === req.message.trim().toLowerCase()
        );
        const hasActivePlanner = req.isFollowUp && req.currentState.days.length > 0;
        const hasBudgetInfo = hasDeterministicBudget || totalBudgetVnd !== null;
        const hasDatesInfo = hasDeterministicDates;
        const hasTravelersInfo = hasDeterministicTravelers || travelersCount !== null || companionType !== null;
        const missingFields = [];
        if (intent === "plan_trip" && !isKnownPreset && !hasActivePlanner) {
          if (!hasBudgetInfo) missingFields.push("budget");
          if (!hasDatesInfo) missingFields.push("dates");
          if (!hasTravelersInfo) missingFields.push("travelers");
        }
        const needsClarification = intent === "plan_trip" && missingFields.length > 0;
        const clarificationQuestion = needsClarification ? typeof parsed.clarificationQuestion === "string" && parsed.clarificationQuestion.trim() ? parsed.clarificationQuestion.trim() : buildClarificationQuestion(req.lang, missingFields) : void 0;
        const stopOperations = Array.isArray(parsed.stopOperations) ? parsed.stopOperations.slice(0, 6).filter((op) => Boolean(op && typeof op === "object")).map((op) => ({
          action: op.action === "remove" ? "remove" : "add",
          placeTitle: String(op.placeTitle || "").trim(),
          dayNumber: typeof op.dayNumber === "number" && Number.isFinite(op.dayNumber) ? Math.max(1, Math.min(4, Math.round(op.dayNumber))) : void 0,
          time: typeof op.time === "string" && op.time.trim() ? op.time.trim() : void 0,
          period: typeof op.period === "string" && op.period.trim() ? op.period.trim() : void 0
        })).filter((op) => op.placeTitle.length > 0) : [];
        return {
          intake: {
            intent,
            travelersCount,
            companionType,
            travelDates,
            duration,
            totalBudgetVnd,
            budgetTier,
            mainPurpose,
            secondaryInterests,
            missingFields,
            needsClarification,
            clarificationQuestion,
            rawUserGoal: deterministic.intake.rawUserGoal
          },
          stopOperations,
          generalQaReply: typeof parsed.generalQaReply === "string" && parsed.generalQaReply.trim() ? parsed.generalQaReply.trim() : void 0,
          ...tavilyQaCtx.citations.length > 0 ? { citations: tavilyQaCtx.citations } : {},
          ...tavilyQaCtx.snippets.length > 0 ? { tavilySnippets: tavilyQaCtx.snippets } : {},
          ...tavilyQaCtx.answer ? { tavilyAnswer: tavilyQaCtx.answer } : {},
          provider: `gemini-ai:${model}`
        };
      } catch {
        return deterministic;
      } finally {
        clearTimeout(timer);
      }
    }
  );
}

// server/services/ai/workflow/followUpRouter.ts
var VALID_ACTIONS = [
  "modify_stops",
  "adjust_budget",
  "swap_logistics",
  "reorder_or_pace",
  "current_trip_qa",
  "full_replan"
];
var AREA_ADJACENCY = {
  BMT: ["BMT", "Ea Kao", "Dray Nur", "H\u1ED3 L\u1EAFk", "Bu\xF4n \u0110\xF4n", "Kr\xF4ng N\u0103ng"],
  "H\u1ED3 L\u1EAFk": ["H\u1ED3 L\u1EAFk", "Ea Kao", "BMT", "Dray Nur", "Ch\u01B0 Yang Sin"],
  "Ea Kao": ["Ea Kao", "BMT", "H\u1ED3 L\u1EAFk", "Dray Nur"],
  "Dray Nur": ["Dray Nur", "BMT", "Ea Kao", "H\u1ED3 L\u1EAFk", "Bu\xF4n \u0110\xF4n"],
  "Bu\xF4n \u0110\xF4n": ["Bu\xF4n \u0110\xF4n", "BMT", "Dray Nur"],
  "Kr\xF4ng N\u0103ng": ["Kr\xF4ng N\u0103ng", "BMT", "Ea Kao"],
  "Ch\u01B0 Yang Sin": ["Ch\u01B0 Yang Sin", "H\u1ED3 L\u1EAFk", "BMT"]
};
var PLACE_SHORT_ALIASES = [
  { keywords: ["b\u1EA3o t\xE0ng th\u1EBF gi\u1EDBi c\xE0 ph\xEA", "th\u1EBF gi\u1EDBi c\xE0 ph\xEA"], title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA" },
  { keywords: ["trung nguy\xEAn", "l\xE0ng c\xE0 ph\xEA"], title: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn" },
  { keywords: ["ako dh\xF4ng", "ako dhong", "ak\xF4 \u0111h\xF4ng"], title: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng" },
  { keywords: ["b\u1EA3o t\xE0ng \u0111\u1EAFk l\u1EAFk", "b\u1EA3o t\xE0ng dak lak"], title: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk" },
  { keywords: ["ea t\xE2n", "ea tan", "n\xF4ng tr\u1EA1i"], title: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n" },
  { keywords: ["\u0111\xE1 voi", "da voi", "yang tao"], title: "\u0110\xE1 Voi M\u1EB9 Yang Tao" },
  { keywords: ["h\u1ED3 l\u1EAFk", "ho lak", "bu\xF4n jun", "buon jun"], title: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun" },
  { keywords: ["bi\u1EC7t \u0111i\u1EC7n", "biet dien", "b\u1EA3o \u0111\u1EA1i"], title: "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i" },
  { keywords: ["dray nur", "th\xE1c dray", "dray s\xE1p"], title: "Th\xE1c Dray Nur H\xF9ng V\u0129" },
  { keywords: ["yok \u0111\xF4n", "yok don", "v\u01B0\u1EDDn qu\u1ED1c gia"], title: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n" },
  { keywords: ["t\u01A1ng j\xFA", "tong ju", "d\u1EC7t th\u1ED5 c\u1EA9m", "th\u1ED5 c\u1EA9m"], title: "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA" },
  { keywords: ["phan \u0111\xECnh gi\xF3t", "phan dinh giot", "ph\u1ED1 \u1EA9m th\u1EF1c"], title: "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t" },
  { keywords: ["b\u1EA3n \u0111\xF4n", "ban don", "c\u1EA7u treo", "s\xEAr\xEAp\u1ED1k"], title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n" }
];
function getCompactDirectory() {
  return dakLakPlaceDirectory.map((meta) => {
    const inferred = inferPlaceMetadata(meta);
    return {
      title: meta.title,
      category: meta.category,
      areaCluster: inferred.areaCluster,
      themeTags: inferred.themeTags,
      time: meta.time,
      period: meta.period,
      location: meta.location,
      meta
    };
  });
}
function getDayCountFromState(req) {
  if (req.currentState.days.length > 0) return req.currentState.days.length;
  if (req.currentState.duration === "2N1D") return 2;
  if (req.currentState.duration === "4N3D+") return 4;
  return 3;
}
function getTravelersHintFromState(req) {
  const comp = req.currentState.companion;
  if (comp === "solo") return 1;
  if (comp === "couple") return 2;
  return 4;
}
function buildBasePreferences(req) {
  return {
    theme: req.currentState.theme,
    duration: req.currentState.duration,
    companion: req.currentState.companion,
    budget: req.currentState.budget
  };
}
function classifyFollowUpActionDeterministic(req) {
  const lower = req.message.toLowerCase().trim();
  const isQuestion = isQuestionOrInfoRequest(lower);
  const isPrimaryInfoQ = isPrimaryAmenityOrInfoQuestion(lower);
  const hasExplicitFullReplanVerb = !isPrimaryInfoQ && !isQuestion && /(lên lại|tạo lại|làm lại|thiết kế lại|xây lại|đổi toàn bộ|lịch trình mới|kế hoạch mới|làm mới lịch|replan|rebuild|start over|new itinerary|from scratch)/i.test(
    lower
  );
  const durationChangeMatch = lower.match(/(2n1[đd]|2\s*ngày|2d1n|3n2[đd]|3\s*ngày|3d2n|4n3[đd]|4\s*ngày|5\s*ngày|4d3n)/i);
  const mentionsDifferentDuration = Boolean(
    durationChangeMatch && (/(2n1[đd]|2\s*ngày|2d1n)/i.test(durationChangeMatch[1]) && req.currentState.duration !== "2N1D" || /(3n2[đd]|3\s*ngày|3d2n)/i.test(durationChangeMatch[1]) && req.currentState.duration !== "3N2D" || /(4n3[đd]|4\s*ngày|5\s*ngày|4d3n)/i.test(durationChangeMatch[1]) && req.currentState.duration !== "4N3D+") && /(đổi|chuyển|thành|sang|lên|tạo|muốn|change|switch|plan|make)/i.test(lower) && !/(ngày\s*[1-4]|day\s*[1-4])/i.test(lower) && !isPrimaryInfoQ && !isQuestion
  );
  const mentionsFullThemeChange = /(chủ đề|phong cách|theme|style)/i.test(lower) && /(đổi|chuyển|sang|thành|change|switch)/i.test(lower) && !isPrimaryInfoQ && !isQuestion;
  if (hasExplicitFullReplanVerb || mentionsDifferentDuration || mentionsFullThemeChange) {
    return "full_replan";
  }
  const isReorderOrPace = !isPrimaryInfoQ && !isQuestion && /(tối ưu tuyến|tối ưu đường|đỡ vòng vèo|sắp xếp lại|xếp lại thứ tự|đảo ngược|đổi chỗ|hoán đổi|đổi thứ tự|giảm nhịp|đi chậm hơn|thư giãn hơn|reorder|optimize.*route|reverse|swap slots|pace)/i.test(
    lower
  );
  if (isReorderOrPace) {
    return "reorder_or_pace";
  }
  const mentionsStayOrTransport = /(xe máy|mô tô|ô tô|tự lái|xe riêng|tài xế|xe buýt|shuttle|phương tiện|di chuyển bằng|khách sạn|homestay|resort|bungalow|villa|chỗ ở|nơi ở|lưu trú|nghỉ đêm|ngủ ở|tented camp|mường thanh|elephants|ako dhông|stay|hotel|accommodation|motorbike|scooter|car|transport|driver)/i.test(
    lower
  );
  const hasExplicitLogisticsSwapCmd = /(đổi\s*(?:sang|qua|thành|về|chỗ ở|khách sạn|homestay|lưu trú|xe|phương tiện)|chuyển\s*(?:sang|qua|thành|về|chỗ ở|khách sạn|homestay|lưu trú|xe)|thay\s*(?:bằng|sang|đổi)|cập nhật\s*(?:lưu trú|chỗ ở|khách sạn|homestay|phương tiện|di chuyển)|switch\s+(?:stay|hotel|accommodation|transport|to)|change\s+(?:stay|hotel|accommodation|transport|to)|replace\s+.*\s+with)/i.test(
    lower
  );
  const hasLogisticsActionVerb = hasExplicitLogisticsSwapCmd || !isQuestion && !isPrimaryInfoQ && /(?:ngủ ở|nghỉ ở|lưu trú ở|đi bằng|\bthuê\b|\bdùng\b|\bsang\b|\bđổi\b|\bchuyển\b|\bthay\b|\bswitch\b|\bchange\b|\buse\b|\brent\b|\bmove\b)/iu.test(
    lower
  );
  const isPureAllocationPct = /(\d+\s*%|phần trăm|tỷ lệ|tỉ lệ|phân bổ)/i.test(lower) || /(tăng|giảm)/i.test(lower) && /(ăn uống|tiền phòng|hoạt động|di chuyển)/i.test(lower) && !/(xe máy|ô tô|xe riêng|xe buýt|homestay|resort|bungalow|hồ lắk|ea kao)/i.test(lower);
  const isExplicitExpenseLineOp = /(khoản chi|khoản|mục chi|chi phí)/i.test(lower);
  const blockedLogisticsBecauseQuestion = isQuestion && (!hasExplicitLogisticsSwapCmd || isPrimaryInfoQ) || isPrimaryInfoQ && !hasExplicitLogisticsSwapCmd;
  if (mentionsStayOrTransport && hasLogisticsActionVerb && !blockedLogisticsBecauseQuestion && !isPureAllocationPct && !isExplicitExpenseLineOp) {
    return "swap_logistics";
  }
  const mentionsBudgetOrExpense = /(ngân sách|chi phí|khoản chi|tiền phòng|lưu trú|ăn uống|hoạt động|phân bổ|tỉ lệ|tỷ lệ|budget|expense|cost|allocation|spend|%)/i.test(
    lower
  );
  const hasExplicitBudgetEditCmd = /(tăng|giảm|cắt|bớt|thêm\s*(?:chi phí|khoản)|xóa\s*(?:chi phí|khoản)|bỏ\s*(?:chi phí|khoản)|đổi\s*(?:ngân sách|tỷ lệ|tỉ lệ|phân bổ)|chuyển|chỉnh|cập nhật|xuống|lên|increase|decrease|reduce|adjust|set\s+budget|add\s+expense|remove\s+expense)/i.test(
    lower
  );
  const hasBudgetEditSignal = hasExplicitBudgetEditCmd || !isQuestion && !isPrimaryInfoQ && /(còn|\d+\s*%|\d+\s*(?:triệu|tr\b|k\b|m\b))/i.test(lower);
  const blockedBudgetBecauseQuestion = isQuestion && (!hasExplicitBudgetEditCmd || isPrimaryInfoQ);
  if (mentionsBudgetOrExpense && hasBudgetEditSignal && !blockedBudgetBecauseQuestion) {
    return "adjust_budget";
  }
  const hasStopModifyVerb = /(đổi|thay|thay thế|bỏ|xóa|bớt|gỡ|thêm|ghé|bổ sung|swap|replace|remove|drop|delete|add|include)/i.test(
    lower
  );
  const hasExplicitStopEditCmd = /(?:đổi|thay\s*thế|thay|swap|replace)\s+.+?\s+(?:sang|thành|bằng|qua|với|for|with|to)\s+/i.test(
    lower
  ) || /(?:^|[,.;]\s*)(?:thêm|bổ sung|bỏ|xóa|bớt|gỡ|add|remove|drop|delete)\s+/i.test(lower);
  const mentionsActiveSlot = req.currentState.days.some(
    (d) => d.slots.some((s) => {
      const titleLower = s.title.toLowerCase();
      const tokens = titleLower.split(/\s+/).filter((t) => t.length >= 3);
      return lower.includes(titleLower) || tokens.filter((t) => lower.includes(t)).length >= 2;
    })
  );
  const mentionsDirectoryOrCategory = PLACE_SHORT_ALIASES.some((a) => a.keywords.some((kw) => lower.includes(kw))) || /(địa điểm|điểm dừng|điểm đến|quán cà phê|cà phê|thác|bảo tàng|buôn|nhà hàng|quán ăn|place|stop|coffee|cafe|waterfall|museum|spot)/i.test(
    lower
  );
  const blockedStopsBecauseQuestion = isQuestion && (!hasExplicitStopEditCmd || isPrimaryInfoQ);
  if (hasStopModifyVerb && (mentionsActiveSlot || mentionsDirectoryOrCategory) && !blockedStopsBecauseQuestion) {
    return "modify_stops";
  }
  if (isQuestion || !hasStopModifyVerb) {
    return "current_trip_qa";
  }
  return "modify_stops";
}
async function classifyWithGeminiDecisions(req, fetchFn) {
  const decisionModel = GEMINI_DECISION_MODEL.trim();
  const apiKey = GEMINI_API_KEY.trim();
  if (!decisionModel || !apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4e3);
  try {
    const daysSummary = req.currentState.days.map((d, idx) => `Day ${idx + 1} (${d.day}): ${d.slots.map((s) => s.title).join(", ")}`).join("\n");
    const historySnippet = (req.history || []).slice(-4).map((h) => `User: ${h.user}
Assistant: ${h.reply}`).join("\n");
    const inputText = [
      `Current plan: theme=${req.currentState.theme}, duration=${req.currentState.duration}, companion=${req.currentState.companion}, budget=${req.currentState.budget}`,
      `Current days:
${daysSummary}`,
      historySnippet ? `Recent conversation:
${historySnippet}` : "",
      `Follow-up message: ${req.message}`
    ].filter(Boolean).join("\n\n");
    const response = await fetchFn("https://generativelanguage.googleapis.com/v1beta/decisions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: decisionModel,
        input: inputText,
        questions: {
          followup_action: {
            type: "choice",
            instructions: 'Choose the single best follow-up routing action. IMPORTANT: Any amenity, price, hours, rental requirement, or factual question (?, "c\xF3 ... kh\xF4ng", "bao nhi\xEAu", "c\u1EA7n g\xEC", "review", "t\u01B0 v\u1EA5n") MUST be classified as current_trip_qa unless there is an unambiguous edit/swap command without being primarily an info question.',
            choices: [
              "modify_stops: explicit command to add, remove, or swap a stop or attraction in the existing itinerary",
              "adjust_budget: explicit command to adjust total budget, expense percentages (food/stay/transit/activity), or add/remove an expense item",
              'swap_logistics: explicit command to switch/change accommodation or transport mode (e.g. "\u0111\u1ED5i sang...", "chuy\u1EC3n sang...") \u2014 NOT amenity/price/rental questions',
              "reorder_or_pace: explicit command to optimize route, reverse day order, swap two slots, or adjust pace",
              "current_trip_qa: answer any question about the current itinerary, stays/homestays/resorts & amenities/prices, transport/rental requirements, places, weather, season, or travel tips without modifying the plan",
              "full_replan: explicitly rebuild the entire itinerary or change overall trip duration/theme"
            ]
          }
        }
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    const ans = data.answers?.followup_action;
    const rawChoice = ans?.choice || ans?.selectedChoice || ans?.answer || ans?.value || "";
    const prefix = rawChoice.split(":")[0].trim();
    return VALID_ACTIONS.includes(prefix) ? prefix : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function classifyFollowUpAction(req, options) {
  return withOpenInferenceSpan(
    "follow_up_classify",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: {
        message: req.message,
        duration: req.currentState.duration,
        daysCount: req.currentState.days.length
      },
      formatOutput: (out) => out
    },
    async () => {
      const fetchFn = options?.fetchFn ?? fetch;
      const deterministicAction = classifyFollowUpActionDeterministic(req);
      const decisionAction = await classifyWithGeminiDecisions(req, fetchFn);
      if (decisionAction) {
        if (deterministicAction === "current_trip_qa" && isQuestionOrInfoRequest(req.message) && (decisionAction === "swap_logistics" || decisionAction === "adjust_budget" || decisionAction === "modify_stops")) {
          return { action: "current_trip_qa", method: "deterministic-qa-guardrail" };
        }
        return { action: decisionAction, method: "gemini_decisions" };
      }
      return {
        action: deterministicAction,
        method: "deterministic"
      };
    }
  );
}
function matchActiveSlotInText(text, days, preferredDayNumber) {
  const lower = text.toLowerCase();
  const candidates = days.map((d, idx) => ({ day: d, dayNumber: idx + 1 }));
  const orderedDays = preferredDayNumber ? [
    ...candidates.filter((c) => c.dayNumber === preferredDayNumber),
    ...candidates.filter((c) => c.dayNumber !== preferredDayNumber)
  ] : candidates;
  for (const { day, dayNumber } of orderedDays) {
    for (const slot of day.slots) {
      const slotLower = slot.title.toLowerCase();
      if (lower.includes(slotLower)) {
        return { title: slot.title, dayNumber, time: slot.time };
      }
      const alias = PLACE_SHORT_ALIASES.find(
        (a) => (slotLower.includes(a.title.toLowerCase()) || a.title.toLowerCase().includes(slotLower)) && a.keywords.some((kw) => lower.includes(kw))
      );
      if (alias) {
        return { title: slot.title, dayNumber, time: slot.time };
      }
    }
  }
  let bestMatch = null;
  for (const { day, dayNumber } of orderedDays) {
    for (const slot of day.slots) {
      const tokens = slot.title.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
      const score = tokens.reduce((acc, tok) => lower.includes(tok) ? acc + 1 : acc, 0);
      if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { title: slot.title, dayNumber, time: slot.time, score };
      }
    }
  }
  if (bestMatch) {
    return { title: bestMatch.title, dayNumber: bestMatch.dayNumber, time: bestMatch.time };
  }
  if (preferredDayNumber && orderedDays[0]?.day.slots.length) {
    const targetDay = orderedDays[0];
    if (/(sáng|morning)/i.test(lower)) {
      const first = targetDay.day.slots[0];
      return { title: first.title, dayNumber: targetDay.dayNumber, time: first.time };
    }
    if (/(chiều|tối|afternoon|evening)/i.test(lower)) {
      const last = targetDay.day.slots[targetDay.day.slots.length - 1];
      return { title: last.title, dayNumber: targetDay.dayNumber, time: last.time };
    }
  }
  return null;
}
function matchDirectoryPlaceByName(text, directory) {
  const lower = text.toLowerCase();
  for (const entry of directory) {
    if (lower.includes(entry.title.toLowerCase())) {
      return entry;
    }
  }
  for (const alias of PLACE_SHORT_ALIASES) {
    if (alias.keywords.some((kw) => lower.includes(kw))) {
      const found = directory.find((d) => d.title === alias.title);
      if (found) return found;
    }
  }
  return null;
}
function detectTargetThemeFromText(text) {
  const lower = text.toLowerCase();
  if (/(cà phê|cafe|coffee|robusta|cupping|espresso|thưởng thức cà phê)/i.test(lower)) {
    return "coffee";
  }
  if (/(ẩm thực|ăn uống|món ăn|đặc sản|bún|cơm lam|gà nướng|food|eat|cuisine|restaurant)/i.test(lower)) {
    return "cuisine";
  }
  if (/(thác|rừng|hồ|thiên nhiên|sinh thái|voi|trekking|waterfall|nature|lake|park)/i.test(lower)) {
    return "nature";
  }
  if (/(văn hóa|bảo tàng|buôn|làng|thổ cẩm|cồng chiêng|di tích|lịch sử|culture|museum|heritage|village)/i.test(lower)) {
    return "culture";
  }
  return null;
}
function pickDirectoryReplacementPlace(targetText, directory, existingTitlesLower, anchorAreaCluster) {
  const unused = directory.filter((d) => !existingTitlesLower.has(d.title.toLowerCase()));
  const pool = unused.length > 0 ? unused : directory;
  const explicitMatch = matchDirectoryPlaceByName(targetText, pool);
  if (explicitMatch) return explicitMatch;
  const desiredTheme = detectTargetThemeFromText(targetText);
  const adjacencyOrder = AREA_ADJACENCY[anchorAreaCluster] || [anchorAreaCluster, "BMT"];
  const scored = pool.map((entry) => {
    let score = 0;
    if (desiredTheme) {
      if (entry.themeTags[0] === desiredTheme) score += 45;
      else if (entry.themeTags.includes(desiredTheme)) score += 18;
      if (desiredTheme === "coffee" && /cà phê/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      } else if (desiredTheme === "cuisine" && /ẩm thực/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      } else if (desiredTheme === "nature" && /(thác|hồ|vườn quốc gia|đá voi)/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      } else if (desiredTheme === "culture" && /(bảo tàng|buôn|làng|di tích|di sản)/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      }
    }
    const clusterIdx = adjacencyOrder.indexOf(entry.areaCluster);
    if (clusterIdx === 0) score += 16;
    else if (clusterIdx > 0) score += Math.max(4, 14 - clusterIdx * 2);
    return { entry, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.entry || null;
}
function resolveModifyStopsDeterministic(req, directory) {
  const lower = req.message.toLowerCase();
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const explicitDay = dayMatch ? Math.min(req.currentState.days.length, Number(dayMatch[1])) : void 0;
  const existingTitlesLower = new Set(
    req.currentState.days.flatMap((d) => d.slots.map((s) => s.title.trim().toLowerCase()))
  );
  const swapMatch = req.message.match(
    /(?:đổi|thay\s*thế|thay|swap|replace)\s+(.+?)\s+(?:sang|thành|bằng|qua|với|for|with|to)\s+(.+)/i
  );
  if (swapMatch) {
    const sourcePart = swapMatch[1];
    const targetPart = swapMatch[2];
    const removedSlot = matchActiveSlotInText(sourcePart, req.currentState.days, explicitDay) || matchActiveSlotInText(req.message, req.currentState.days, explicitDay);
    if (removedSlot) {
      const removedDir = directory.find(
        (d) => d.title.toLowerCase() === removedSlot.title.toLowerCase()
      );
      const anchorCluster = removedDir?.areaCluster || "BMT";
      const replacement = pickDirectoryReplacementPlace(
        targetPart,
        directory,
        existingTitlesLower,
        anchorCluster
      );
      if (replacement) {
        const stopOperations = [
          {
            action: "remove",
            placeTitle: removedSlot.title,
            dayNumber: removedSlot.dayNumber
          },
          {
            action: "add",
            placeTitle: replacement.title,
            dayNumber: removedSlot.dayNumber,
            time: removedSlot.time || replacement.time,
            period: replacement.period
          }
        ];
        const reply2 = req.lang === "en" ? `Replaced "${removedSlot.title}" on Day ${removedSlot.dayNumber} with "${replacement.title}" (${replacement.category} \u2022 ${replacement.areaCluster}) while keeping the rest of your itinerary intact.` : `\u0110\xE3 \u0111\u1ED5i "${removedSlot.title}" \u1EDF Ng\xE0y ${removedSlot.dayNumber} sang "${replacement.title}" (${replacement.category} \u2022 khu v\u1EF1c ${replacement.areaCluster}) v\xE0 gi\u1EEF nguy\xEAn c\xE1c \u0111i\u1EC3m c\xF2n l\u1EA1i.`;
        return { stopOperations, reply: reply2 };
      }
    }
  }
  const isRemove = /(bỏ|xóa|bớt|gỡ|remove|drop|delete)/i.test(lower);
  const isAdd = /(thêm|ghé|bổ sung|add|include|visit)/i.test(lower);
  const ops = [];
  if (isRemove) {
    const removedSlot = matchActiveSlotInText(req.message, req.currentState.days, explicitDay);
    if (removedSlot) {
      ops.push({
        action: "remove",
        placeTitle: removedSlot.title,
        dayNumber: removedSlot.dayNumber
      });
    }
  }
  if (isAdd || ops.length === 0) {
    const anchorCluster = req.currentState.days[(explicitDay || 1) - 1]?.title.includes("H\u1ED3 L\u1EAFk") ? "H\u1ED3 L\u1EAFk" : "BMT";
    const picked = pickDirectoryReplacementPlace(
      req.message,
      directory,
      existingTitlesLower,
      anchorCluster
    );
    if (picked) {
      const targetDay = explicitDay || Math.max(1, req.currentState.days.length);
      ops.push({
        action: "add",
        placeTitle: picked.title,
        dayNumber: targetDay,
        time: picked.time,
        period: picked.period
      });
    }
  }
  const summaryList = ops.map(
    (op) => `${op.action === "remove" ? "-" : "+"} ${op.placeTitle} (${req.lang === "en" ? `Day ${op.dayNumber || 1}` : `Ng\xE0y ${op.dayNumber || 1}`})`
  ).join(", ");
  const reply = ops.length > 0 ? req.lang === "en" ? `Updated your itinerary stops (${summaryList}) while preserving the rest of your trip.` : `\u0110\xE3 c\u1EADp nh\u1EADt \u0111i\u1EC3m d\u1EEBng trong l\u1ECBch tr\xECnh (${summaryList}) v\xE0 gi\u1EEF nguy\xEAn c\u1EA5u tr\xFAc c\xE1c ng\xE0y c\xF2n l\u1EA1i.` : req.lang === "en" ? "Could you share which stop in your itinerary you want to add, remove, or replace?" : "B\u1EA1n cho m\xECnh bi\u1EBFt r\xF5 \u0111i\u1EC3m d\u1EEBng mu\u1ED1n th\xEAm, b\u1EDBt ho\u1EB7c \u0111\u1ED5i sang tr\u1EA3i nghi\u1EC7m n\xE0o trong l\u1ECBch tr\xECnh nh\xE9!";
  return { stopOperations: ops, reply };
}
var MODIFY_STOPS_SCHEMA = {
  type: "OBJECT",
  properties: {
    stopOperations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          action: { type: "STRING", enum: ["add", "remove"] },
          placeTitle: { type: "STRING" },
          dayNumber: { type: "INTEGER" },
          time: { type: "STRING" },
          period: { type: "STRING" }
        },
        required: ["action", "placeTitle", "dayNumber"]
      }
    },
    reply: { type: "STRING" }
  },
  required: ["stopOperations", "reply"]
};
async function handleModifyStopsFollowUp(req, fetchFn) {
  return withOpenInferenceSpan(
    "follow_up_modify_stops",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, daysCount: req.currentState.days.length },
      formatOutput: (res) => ({
        stopOperations: res.stopOperations,
        provider: res.provider
      })
    },
    async () => {
      const directory = getCompactDirectory();
      const deterministic = resolveModifyStopsDeterministic(req, directory);
      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return {
          intent: "modify_stops",
          followUpAction: "modify_stops",
          reply: deterministic.reply,
          shouldOpenPlanner: true,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: deterministic.stopOperations,
          suggestedTab: "schedule",
          status: "completed",
          provider: "local-fallback"
        };
      }
      const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const compactDirPayload = directory.map((d) => ({
        title: d.title,
        category: d.category,
        areaCluster: d.areaCluster,
        time: d.time,
        period: d.period
      }));
      const compactDaysPayload = req.currentState.days.map((d, idx) => ({
        dayNumber: idx + 1,
        day: d.day,
        title: d.title,
        slots: d.slots.map((s) => ({ title: s.title, location: s.location, time: s.time }))
      }));
      const historySnippet = (req.history || []).slice(-4).map((h) => `User: ${h.user}
Assistant: ${h.reply}`).join("\n");
      const systemText = [
        "You are the Stop-Swap Micro-Router for \u0110\u1EAFk L\u1EAFk AI Travel Concierge.",
        `UI language: "${req.lang}".`,
        "Resolve the user follow-up edit into exact `stopOperations` grounded in `dakLakPlaceDirectory` and `currentDays`.",
        "Rules:",
        "- Every `remove` placeTitle MUST match an existing slot title in `currentDays`.",
        "- Every `add` placeTitle MUST be an exact `title` from `dakLakPlaceDirectory` that is NOT already in `currentDays`.",
        '- When the user swaps/replaces a stop (even by category like "1 n\u01A1i \u0111\u1EC3 th\u01B0\u1EDFng th\u1EE9c c\xE0 ph\xEA"), emit BOTH `remove` and `add` with the SAME `dayNumber` in the same or adjacent `areaCluster`.',
        "- Never suggest elephant riding.",
        "- Write a concise, tailored `reply` confirming the exact change."
      ].join("\n");
      const prompt = [
        `dakLakPlaceDirectory:
${JSON.stringify(compactDirPayload)}`,
        `currentDays:
${JSON.stringify(compactDaysPayload)}`,
        historySnippet ? `recentHistory:
${historySnippet}` : "",
        `userMessage: ${req.message}`
      ].filter(Boolean).join("\n\n");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(12e3, AI_CHAT_TIMEOUT_MS));
      try {
        const llmOut = await withOpenInferenceSpan(
          "gemini_follow_up_modify_stops",
          {
            kind: OpenInferenceSpanKind4.LLM,
            input: prompt,
            attributes: {
              [LLM_MODEL_NAME2]: model,
              [LLM_PROVIDER2]: "google",
              [LLM_SYSTEM2]: "gemini",
              [`${SemanticConventions3.LLM_INPUT_MESSAGES}.0.${SemanticConventions3.MESSAGE_ROLE}`]: "system",
              [`${SemanticConventions3.LLM_INPUT_MESSAGES}.0.${SemanticConventions3.MESSAGE_CONTENT}`]: systemText,
              [`${SemanticConventions3.LLM_INPUT_MESSAGES}.1.${SemanticConventions3.MESSAGE_ROLE}`]: "user",
              [`${SemanticConventions3.LLM_INPUT_MESSAGES}.1.${SemanticConventions3.MESSAGE_CONTENT}`]: prompt
            },
            formatOutput: (res) => res.rawText,
            onSuccess: (span, res) => {
              if (res.usage?.promptTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_PROMPT2, res.usage.promptTokenCount);
              }
              if (res.usage?.candidatesTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_COMPLETION2, res.usage.candidatesTokenCount);
              }
              if (res.usage?.totalTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_TOTAL2, res.usage.totalTokenCount);
              }
            }
          },
          async () => {
            const response = await fetchFn(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.15,
                  maxOutputTokens: 768,
                  responseMimeType: "application/json",
                  responseSchema: MODIFY_STOPS_SCHEMA
                }
              })
            });
            if (!response.ok) {
              throw new Error(`Gemini modify_stops HTTP ${response.status}`);
            }
            const data = await response.json();
            const rawText = (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            return { rawText, usage: data.usageMetadata };
          }
        );
        const jsonText = llmOut.rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(jsonText);
        const existingLower = new Set(
          req.currentState.days.flatMap((d) => d.slots.map((s) => s.title.toLowerCase()))
        );
        const dirTitlesMap = new Map(directory.map((d) => [d.title.toLowerCase(), d]));
        const validatedOps = (parsed.stopOperations || []).filter((op) => op && typeof op === "object").map((op) => {
          const action = op.action === "remove" ? "remove" : "add";
          const rawTitle = String(op.placeTitle || "").trim();
          const dayNumber = Math.max(
            1,
            Math.min(req.currentState.days.length, Math.round(Number(op.dayNumber) || 1))
          );
          if (action === "remove") {
            const matchedSlot = matchActiveSlotInText(rawTitle, req.currentState.days, dayNumber);
            if (!matchedSlot) return null;
            return {
              action: "remove",
              placeTitle: matchedSlot.title,
              dayNumber: matchedSlot.dayNumber
            };
          }
          const dirMatch = dirTitlesMap.get(rawTitle.toLowerCase()) || matchDirectoryPlaceByName(rawTitle, directory);
          if (!dirMatch || existingLower.has(dirMatch.title.toLowerCase())) {
            return null;
          }
          return {
            action: "add",
            placeTitle: dirMatch.title,
            dayNumber,
            time: typeof op.time === "string" && op.time.trim() ? op.time.trim() : dirMatch.time,
            period: typeof op.period === "string" && op.period.trim() ? op.period.trim() : dirMatch.period
          };
        }).filter((op) => op !== null);
        const hasSwapIntent = /(đổi|thay|swap|replace)/i.test(req.message);
        const hasRemove = validatedOps.some((o) => o.action === "remove");
        const hasAdd = validatedOps.some((o) => o.action === "add");
        const useDeterministic = validatedOps.length === 0 || hasSwapIntent && (!hasRemove || !hasAdd);
        const finalOps = useDeterministic ? deterministic.stopOperations : validatedOps;
        const rawReply = !useDeterministic && typeof parsed.reply === "string" && parsed.reply.trim() && !hasElephantRidingViolation(parsed.reply) ? parsed.reply.trim() : deterministic.reply;
        return {
          intent: "modify_stops",
          followUpAction: "modify_stops",
          reply: rawReply,
          shouldOpenPlanner: true,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: finalOps,
          suggestedTab: "schedule",
          status: "completed",
          provider: useDeterministic ? "local-fallback" : `gemini-ai:${model}`
        };
      } catch {
        return {
          intent: "modify_stops",
          followUpAction: "modify_stops",
          reply: deterministic.reply,
          shouldOpenPlanner: true,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: deterministic.stopOperations,
          suggestedTab: "schedule",
          status: "completed",
          provider: "local-fallback"
        };
      } finally {
        clearTimeout(timer);
      }
    }
  );
}
var EXPENSE_CATS = ["stay", "transit", "food", "activity"];
function computeBaseAllocationPcts(currentExpenses) {
  if (!currentExpenses || currentExpenses.length === 0) {
    return { stay: 35, transit: 20, food: 25, activity: 20 };
  }
  const sums = { stay: 0, transit: 0, food: 0, activity: 0 };
  let total = 0;
  for (const item of currentExpenses) {
    const amt = Math.max(0, Number(item.amount) || 0);
    if (EXPENSE_CATS.includes(item.cat)) {
      sums[item.cat] += amt;
      total += amt;
    }
  }
  if (total <= 0) {
    return { stay: 35, transit: 20, food: 25, activity: 20 };
  }
  const pcts = {
    stay: Math.max(5, Math.round(sums.stay / total * 100)),
    transit: Math.max(5, Math.round(sums.transit / total * 100)),
    food: Math.max(5, Math.round(sums.food / total * 100)),
    activity: Math.max(5, Math.round(sums.activity / total * 100))
  };
  return normalizeAllocationPctsTo100(pcts);
}
function normalizeAllocationPctsTo100(raw, locked, decreaseHints, increaseHints) {
  const pcts = {
    stay: Math.max(5, Math.min(80, Math.round(raw.stay ?? 35))),
    transit: Math.max(5, Math.min(80, Math.round(raw.transit ?? 20))),
    food: Math.max(5, Math.min(80, Math.round(raw.food ?? 25))),
    activity: Math.max(5, Math.min(80, Math.round(raw.activity ?? 20)))
  };
  let diff = pcts.stay + pcts.transit + pcts.food + pcts.activity - 100;
  if (diff > 0) {
    const order = [
      ...decreaseHints ? Array.from(decreaseHints) : [],
      ...EXPENSE_CATS.filter((c) => !locked?.has(c) && !decreaseHints?.has(c)),
      ...EXPENSE_CATS.filter((c) => locked?.has(c))
    ];
    for (const cat of order) {
      if (diff <= 0) break;
      const reducible = Math.max(0, pcts[cat] - 5);
      const take = Math.min(reducible, diff);
      pcts[cat] -= take;
      diff -= take;
    }
  } else if (diff < 0) {
    let needed = -diff;
    const order = [
      ...increaseHints ? Array.from(increaseHints) : [],
      ...EXPENSE_CATS.filter((c) => !locked?.has(c) && !increaseHints?.has(c)),
      ...EXPENSE_CATS.filter((c) => locked?.has(c))
    ];
    for (const cat of order) {
      if (needed <= 0) break;
      const addable = Math.max(0, 80 - pcts[cat]);
      const add = Math.min(addable, needed);
      pcts[cat] += add;
      needed -= add;
    }
  }
  return pcts;
}
function extractAmountVnd(text) {
  const millionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b|million|m\b)/i);
  if (millionMatch) {
    const val = Math.round(Number(millionMatch[1].replace(",", ".")) * 1e6);
    if (Number.isFinite(val) && val >= 5e4) return val;
  }
  const kMatch = text.match(/(\d{2,4})\s*k\b/i);
  if (kMatch) {
    const val = Math.round(Number(kMatch[1]) * 1e3);
    if (Number.isFinite(val) && val >= 1e4) return val;
  }
  const fullMatch = text.match(/(\d{1,3}(?:[.,]\d{3})+|\d{5,9})\s*(?:đồng|vnđ|vnd|đ)?/i);
  if (fullMatch) {
    const val = Number(fullMatch[1].replace(/[.,]/g, ""));
    if (Number.isFinite(val) && val >= 1e4) return val;
  }
  return null;
}
function resolveAdjustBudgetDeterministic(req) {
  const lower = req.message.toLowerCase();
  const basePcts = computeBaseAllocationPcts(req.currentExpenses);
  const travelers = getTravelersHintFromState(req);
  const catMatchers = [
    {
      cat: "stay",
      regex: /(tiền phòng|lưu trú|khách sạn|homestay|chỗ ở|phòng ở|stay|hotel|lodging)/i,
      labelVi: "l\u01B0u tr\xFA"
    },
    {
      cat: "transit",
      regex: /(di chuyển|đi lại|vận chuyển|thuê xe|xe cộ|transit|transport)/i,
      labelVi: "di chuy\u1EC3n"
    },
    {
      cat: "food",
      regex: /(ăn uống|ẩm thực|đồ ăn|bữa ăn|cà phê|food|dining|meal)/i,
      labelVi: "\u0103n u\u1ED1ng"
    },
    {
      cat: "activity",
      regex: /(hoạt động|tham quan|vé|vui chơi|trải nghiệm|activity|tickets?)/i,
      labelVi: "tham quan & ho\u1EA1t \u0111\u1ED9ng"
    }
  ];
  const isCustomExpenseOp = /(khoản|mục chi|chi phí mua|mua quà|phát sinh|add expense|remove expense)/i.test(lower) || /(thêm|bỏ|xóa)\s+(?:chi phí|khoản)/i.test(lower) && !/%/.test(lower);
  if (isCustomExpenseOp) {
    const isRemove = /(bỏ|xóa|gỡ|remove|drop|delete)/i.test(lower);
    const amount = extractAmountVnd(req.message) ?? 3e5;
    const matchedCat = catMatchers.find((c) => c.regex.test(lower))?.cat || "activity";
    const cleanedTitle = req.message.replace(/^(?:thêm|bổ sung|bỏ|xóa|add|remove)\s+(?:chi phí|khoản chi|khoản|mục)?\s*/i, "").replace(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b|k\b|vnđ|vnd|đồng|đ)/gi, "").trim();
    const title = cleanedTitle || (matchedCat === "food" ? "Chi ph\xED \u0103n u\u1ED1ng b\u1ED5 sung" : "Chi ph\xED ph\xE1t sinh");
    const expensePatch2 = {
      customExpenseOps: [
        isRemove ? { action: "remove", title, cat: matchedCat } : { action: "add", title, cat: matchedCat, amount }
      ]
    };
    const reply2 = req.lang === "en" ? `${isRemove ? "Removed" : "Added"} expense item "${title}" (${amount.toLocaleString("en-US")} VND) without changing your map stops.` : `\u0110\xE3 ${isRemove ? "b\u1ECF" : "th\xEAm"} kho\u1EA3n chi "${title}" (${amount.toLocaleString("vi-VN")}\u0111) trong b\u1EA3ng ng\xE2n s\xE1ch, gi\u1EEF nguy\xEAn to\xE0n b\u1ED9 \u0111i\u1EC3m d\u1EEBng.`;
    return { expensePatch: expensePatch2, reply: reply2 };
  }
  let totalBudgetVnd;
  if (/(tổng ngân sách|ngân sách|total budget|chỉ còn|giảm xuống|tăng lên)/i.test(lower) && !/%/.test(lower)) {
    const budgetParsed = extractBudgetVndFromText(req.message, travelers);
    if (budgetParsed.totalBudgetVnd) {
      totalBudgetVnd = budgetParsed.totalBudgetVnd;
    }
  } else if (/(tổng ngân sách|ngân sách).*\d+\s*(?:triệu|tr\b|m\b)/i.test(lower)) {
    const budgetParsed = extractBudgetVndFromText(req.message, travelers);
    if (budgetParsed.totalBudgetVnd) {
      totalBudgetVnd = budgetParsed.totalBudgetVnd;
    }
  }
  const clauses = lower.split(/[,;.]|\bvà\b|\bnhưng\b|\band\b/i).map((c) => c.trim()).filter(Boolean);
  const nextPcts = { ...basePcts };
  const locked = /* @__PURE__ */ new Set();
  const decreaseHints = /* @__PURE__ */ new Set();
  const increaseHints = /* @__PURE__ */ new Set();
  for (const clause of clauses) {
    const pctMatch = clause.match(/(\d{1,2})\s*%/);
    const pctVal = pctMatch ? Number(pctMatch[1]) : null;
    const isInc = /(tăng|lên|ưu tiên|nhiều hơn|increase|raise|more)/i.test(clause);
    const isDec = /(giảm|xuống|cắt|bớt|ít hơn|tiết kiệm|decrease|reduce|cut|less)/i.test(clause);
    for (const matcher of catMatchers) {
      if (matcher.regex.test(clause)) {
        if (pctVal !== null && pctVal >= 5 && pctVal <= 80) {
          nextPcts[matcher.cat] = pctVal;
          locked.add(matcher.cat);
        } else if (isInc) {
          increaseHints.add(matcher.cat);
        } else if (isDec) {
          decreaseHints.add(matcher.cat);
        }
      }
    }
  }
  if (locked.size === 0 && (increaseHints.size > 0 || decreaseHints.size > 0)) {
    for (const cat of increaseHints) {
      nextPcts[cat] = Math.min(75, (nextPcts[cat] ?? 25) + 10);
      locked.add(cat);
    }
    for (const cat of decreaseHints) {
      nextPcts[cat] = Math.max(5, (nextPcts[cat] ?? 25) - 10);
      if (increaseHints.size === 0) locked.add(cat);
    }
  }
  const hasAllocationChange = locked.size > 0 || increaseHints.size > 0 || decreaseHints.size > 0;
  const normalizedPcts = hasAllocationChange ? normalizeAllocationPctsTo100(nextPcts, locked, decreaseHints, increaseHints) : void 0;
  const expensePatch = {};
  if (totalBudgetVnd !== void 0) {
    expensePatch.totalBudgetVnd = totalBudgetVnd;
  }
  if (normalizedPcts) {
    expensePatch.allocationPcts = normalizedPcts;
  }
  if (!expensePatch.totalBudgetVnd && !expensePatch.allocationPcts) {
    const currentTotal = (req.currentExpenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    if (/(giảm|tiết kiệm|cắt)/i.test(lower)) {
      expensePatch.totalBudgetVnd = Math.max(
        15e5,
        Math.round((currentTotal || 6e6) * 0.85 / 1e5) * 1e5
      );
    } else {
      expensePatch.allocationPcts = basePcts;
    }
  }
  const parts = [];
  if (expensePatch.totalBudgetVnd) {
    parts.push(
      req.lang === "en" ? `target budget ${expensePatch.totalBudgetVnd.toLocaleString("en-US")} VND` : `t\u1ED5ng ng\xE2n s\xE1ch ${expensePatch.totalBudgetVnd.toLocaleString("vi-VN")}\u0111`
    );
  }
  if (expensePatch.allocationPcts) {
    const p = expensePatch.allocationPcts;
    parts.push(
      req.lang === "en" ? `allocation (Stay ${p.stay}%, Transit ${p.transit}%, Food ${p.food}%, Activities ${p.activity}%)` : `t\u1EF7 l\u1EC7 m\u1EDBi (L\u01B0u tr\xFA ${p.stay}%, Di chuy\u1EC3n ${p.transit}%, \u0102n u\u1ED1ng ${p.food}%, Ho\u1EA1t \u0111\u1ED9ng ${p.activity}%)`
    );
  }
  const reply = req.lang === "en" ? `Updated your budget breakdown (${parts.join(" \u2022 ")}) while keeping all itinerary stops unchanged.` : `\u0110\xE3 \u0111i\u1EC1u ch\u1EC9nh c\u01A1 c\u1EA5u chi ph\xED theo ${parts.join(" \u2022 ")}, gi\u1EEF nguy\xEAn to\xE0n b\u1ED9 c\xE1c \u0111i\u1EC3m tham quan tr\xEAn b\u1EA3n \u0111\u1ED3.`;
  return { expensePatch, reply };
}
async function handleAdjustBudgetFollowUp(req) {
  return withOpenInferenceSpan(
    "follow_up_adjust_budget",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, currentExpenses: req.currentExpenses || [] },
      formatOutput: (res) => ({
        expensePatch: res.expensePatch,
        provider: res.provider
      })
    },
    async () => {
      const { expensePatch, reply } = resolveAdjustBudgetDeterministic(req);
      return {
        intent: "update_itinerary",
        followUpAction: "adjust_budget",
        reply,
        shouldOpenPlanner: true,
        preferences: buildBasePreferences(req),
        resetItineraryToTheme: false,
        stopOperations: [],
        expensePatch,
        suggestedTab: "schedule",
        status: "completed",
        provider: "local-fallback"
      };
    }
  );
}
function matchRequestedStay(lower, stays, fallbackTier) {
  if (stays.length === 0) return null;
  const folded = foldVietnamese(lower);
  const directMatch = stays.find(
    (s) => folded.includes(foldVietnamese(s.name)) || folded.includes("elephants") && foldVietnamese(s.name).includes("elephants") || folded.includes("muong thanh") && foldVietnamese(s.name).includes("muong thanh") || folded.includes("lak tented") && foldVietnamese(s.name).includes("lak tented") || folded.includes("ako dhong") && foldVietnamese(s.name).includes("ako dhong") || folded.includes("zan") && foldVietnamese(s.name).includes("zan")
  );
  if (directMatch) return directMatch;
  const wantsHoLak = /(hồ lắk|ho lak|liên sơn|buôn jun)/i.test(lower);
  const wantsEaKao = /(ea kao|tơng jú)/i.test(lower);
  const wantsBmt = /(bmt|buôn ma thuột|trung tâm|ako dhông|mường thanh|elephants)/i.test(lower);
  let pool = stays;
  if (wantsHoLak) {
    const areaMatches = stays.filter((s) => s.area.toLowerCase().includes("h\u1ED3 l\u1EAFk"));
    if (areaMatches.length > 0) pool = areaMatches;
  } else if (wantsEaKao) {
    const areaMatches = stays.filter((s) => s.area.toLowerCase().includes("ea kao"));
    if (areaMatches.length > 0) pool = areaMatches;
  } else if (wantsBmt) {
    const areaMatches = stays.filter((s) => s.area.toLowerCase().includes("bmt"));
    if (areaMatches.length > 0) pool = areaMatches;
  }
  let targetTier = null;
  if (/(homestay|nhà dài|tiết kiệm|bình dân|rẻ|budget)/i.test(lower)) targetTier = "budget";
  else if (/(resort|villa|5 sao|cao cấp|sang trọng|luxury)/i.test(lower)) targetTier = "luxury";
  else if (/(khách sạn|bungalow|tented|4 sao|tiêu chuẩn|standard)/i.test(lower)) targetTier = "standard";
  return (targetTier ? pool.find((s) => s.tier === targetTier) : void 0) || pool.find((s) => s.tier === fallbackTier) || pool[0] || null;
}
function matchRequestedLogistics(lower, logistics, fallbackTier) {
  if (logistics.length === 0) return null;
  if (/(xe máy|mô tô|tay ga|xe số|motorbike|scooter)/i.test(lower)) {
    return logistics.find((l) => l.mode === "motorbike") || logistics[0];
  }
  if (/(xe buýt|shuttle|xe khách|bus)/i.test(lower)) {
    return logistics.find((l) => l.mode === "local_bus_shuttle") || logistics[0];
  }
  if (/(tự lái|ô tô 4|ô tô 5|self[- ]?drive|self drive)/i.test(lower)) {
    return logistics.find((l) => l.mode === "self_drive_car") || logistics[0];
  }
  if (/(xe riêng|tài xế|7 chỗ|private car|driver)/i.test(lower)) {
    return logistics.find((l) => l.mode === "private_car_driver") || logistics[0];
  }
  return logistics.find((l) => l.tier === fallbackTier) || logistics[0] || null;
}
async function handleSwapLogisticsFollowUp(req, options) {
  return withOpenInferenceSpan(
    "follow_up_swap_logistics",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, companion: req.currentState.companion },
      formatOutput: (res) => ({
        stayMovePatch: res.stayMovePatch,
        expensePatch: res.expensePatch,
        provider: res.provider
      })
    },
    async () => {
      const lower = req.message.toLowerCase();
      const dayCount = getDayCountFromState(req);
      const nights = Math.max(1, dayCount - 1);
      const travelersCount = getTravelersHintFromState(req);
      const stays = options?.stays ?? await listActiveStays({ travelersCount, companionType: req.currentState.companion });
      const logistics = options?.logistics ?? await listActiveLogistics({ travelersCount, companionType: req.currentState.companion });
      const mentionsStay = /(khách sạn|homestay|resort|bungalow|chỗ ở|nơi ở|lưu trú|nghỉ đêm|ngủ ở|hồ lắk|ea kao|ako dhông|mường thanh|stay|hotel|accommodation)/i.test(
        lower
      );
      const mentionsTransport = /(xe máy|mô tô|ô tô|tự lái|xe riêng|tài xế|xe buýt|shuttle|phương tiện|di chuyển|motorbike|car|bus|transport|driver)/i.test(
        lower
      );
      const selectedStay = matchRequestedStay(lower, stays, req.currentState.budget);
      const selectedLogistics = matchRequestedLogistics(lower, logistics, req.currentState.budget);
      const roomsNeeded = selectedStay ? Math.max(1, Math.ceil(travelersCount / Math.max(1, selectedStay.capacityMax))) : 1;
      const newStayVnd = selectedStay ? selectedStay.nightlyRateVnd * nights * roomsNeeded : 0;
      const newTransitVnd = selectedLogistics ? selectedLogistics.dailyRateVnd * dayCount : 0;
      const isEn = req.lang === "en";
      const stayLabel = selectedStay ? isEn ? `${selectedStay.name} (${selectedStay.area} \u2022 ~${selectedStay.nightlyRateVnd.toLocaleString("en-US")} VND/night)` : `${selectedStay.name} (${selectedStay.area} \u2022 ~${selectedStay.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm)` : budgetMultipliers[req.currentState.budget].stayMove;
      const transitLabel = selectedLogistics ? isEn ? `${selectedLogistics.label} (~${selectedLogistics.dailyRateVnd.toLocaleString("en-US")} VND/day)` : `${selectedLogistics.label} (~${selectedLogistics.dailyRateVnd.toLocaleString("vi-VN")}\u0111/ng\xE0y)` : "";
      const stayMovePatch = {
        stayMove: [stayLabel, transitLabel].filter(Boolean).join(" \u2022 "),
        selectedStayId: selectedStay ? String(selectedStay.id) : void 0,
        selectedLogisticsId: selectedLogistics ? String(selectedLogistics.id) : void 0
      };
      const customExpenseOps = [];
      const existingStayItem = (req.currentExpenses || []).find((e) => e.cat === "stay");
      const existingTransitItem = (req.currentExpenses || []).find((e) => e.cat === "transit");
      if ((mentionsStay || !mentionsTransport) && selectedStay) {
        customExpenseOps.push({
          action: "remove",
          title: existingStayItem?.title || (isEn ? "Stay" : "L\u01B0u tr\xFA"),
          cat: "stay"
        });
        customExpenseOps.push({
          action: "add",
          title: isEn ? `Stay ${nights} nights (${selectedStay.name})` : `L\u01B0u tr\xFA ${nights} \u0111\xEAm (${selectedStay.name})`,
          cat: "stay",
          amount: newStayVnd
        });
      }
      if ((mentionsTransport || !mentionsStay) && selectedLogistics) {
        customExpenseOps.push({
          action: "remove",
          title: existingTransitItem?.title || (isEn ? "Transport" : "Di chuy\u1EC3n"),
          cat: "transit"
        });
        customExpenseOps.push({
          action: "add",
          title: isEn ? `${selectedLogistics.label} (${dayCount} days)` : `${selectedLogistics.label} (${dayCount} ng\xE0y)`,
          cat: "transit",
          amount: newTransitVnd
        });
      }
      const expensePatch = { customExpenseOps };
      const reply = req.lang === "en" ? `Updated your stay & transport to: ${stayMovePatch.stayMove} and recalculated stay/transit expenses without modifying map stops.` : `\u0110\xE3 c\u1EADp nh\u1EADt l\u01B0u tr\xFA & di chuy\u1EC3n sang: ${stayMovePatch.stayMove}, \u0111\u1ED3ng th\u1EDDi c\u1EADp nh\u1EADt l\u1EA1i kho\u1EA3n chi l\u01B0u tr\xFA/di chuy\u1EC3n v\xE0 gi\u1EEF nguy\xEAn c\xE1c \u0111i\u1EC3m tham quan.`;
      return {
        intent: "update_itinerary",
        followUpAction: "swap_logistics",
        reply,
        shouldOpenPlanner: true,
        preferences: buildBasePreferences(req),
        resetItineraryToTheme: false,
        stopOperations: [],
        stayMovePatch,
        expensePatch,
        suggestedTab: "schedule",
        status: "completed",
        provider: "local-fallback"
      };
    }
  );
}
function resolveReorderOpsDeterministic(req) {
  const lower = req.message.toLowerCase();
  const days = req.currentState.days;
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const explicitDay = dayMatch ? Math.max(1, Math.min(days.length, Number(dayMatch[1]))) : null;
  const isSwapSlots = /(đổi chỗ|hoán đổi|đổi thứ tự|swap\s*slots?|swap\s*\d)/i.test(lower);
  const isReverse = /(đảo ngược|ngược lại|reverse)/i.test(lower);
  const reorderOps = [];
  if (isSwapSlots) {
    const targetDay = explicitDay || 1;
    const daySlots = days[targetDay - 1]?.slots || [];
    const twoNumMatch = lower.match(/(\d+)\s*(?:và|với|&|and)\s*(?:điểm|slot|mục|chỗ)?\s*(\d+)/i);
    let slotIndexA = 0;
    let slotIndexB = Math.max(0, Math.min(1, daySlots.length - 1));
    if (twoNumMatch) {
      const a = Math.max(1, Number(twoNumMatch[1])) - 1;
      const b = Math.max(1, Number(twoNumMatch[2])) - 1;
      if (daySlots.length > 0) {
        slotIndexA = Math.min(daySlots.length - 1, a);
        slotIndexB = Math.min(daySlots.length - 1, b);
      } else {
        slotIndexA = a;
        slotIndexB = b;
      }
    } else if (/(sáng|morning)/i.test(lower) && /(chiều|tối|afternoon|evening)/i.test(lower)) {
      slotIndexA = 0;
      slotIndexB = Math.max(1, daySlots.length - 1);
    }
    reorderOps.push({
      dayNumber: targetDay,
      action: "swap_slots",
      slotIndexA,
      slotIndexB
    });
  } else if (isReverse) {
    if (explicitDay) {
      reorderOps.push({ dayNumber: explicitDay, action: "reverse" });
    } else {
      days.forEach((d, idx) => {
        if (d.slots.length >= 2) {
          reorderOps.push({ dayNumber: idx + 1, action: "reverse" });
        }
      });
    }
  } else {
    if (explicitDay) {
      reorderOps.push({ dayNumber: explicitDay, action: "optimize_route" });
    } else {
      days.forEach((d, idx) => {
        if (d.slots.length >= 2) {
          reorderOps.push({ dayNumber: idx + 1, action: "optimize_route" });
        }
      });
      if (reorderOps.length === 0 && days.length > 0) {
        reorderOps.push({ dayNumber: 1, action: "optimize_route" });
      }
    }
  }
  const descList = reorderOps.map((op) => {
    if (op.action === "swap_slots") {
      return `\u0111\u1ED5i v\u1ECB tr\xED \u0111i\u1EC3m ${(op.slotIndexA ?? 0) + 1} \u2194 ${(op.slotIndexB ?? 1) + 1} (Ng\xE0y ${op.dayNumber})`;
    }
    if (op.action === "reverse") {
      return `\u0111\u1EA3o ng\u01B0\u1EE3c th\u1EE9 t\u1EF1 Ng\xE0y ${op.dayNumber}`;
    }
    return `t\u1ED1i \u01B0u tuy\u1EBFn \u0111\u01B0\u1EDDng Ng\xE0y ${op.dayNumber}`;
  }).join(", ");
  const reply = req.lang === "en" ? `Reordered your active schedule (${reorderOps.map((o) => `Day ${o.dayNumber}: ${o.action}`).join(", ")}) without changing your stops or budget.` : `\u0110\xE3 s\u1EAFp x\u1EBFp l\u1EA1i l\u1ED9 tr\xECnh (${descList}) \u0111\u1EC3 di chuy\u1EC3n thu\u1EADn ti\u1EC7n h\u01A1n, gi\u1EEF nguy\xEAn c\xE1c \u0111i\u1EC3m d\u1EEBng v\xE0 ng\xE2n s\xE1ch.`;
  return { reorderOps, reply };
}
async function handleReorderOrPaceFollowUp(req) {
  return withOpenInferenceSpan(
    "follow_up_reorder_or_pace",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, daysCount: req.currentState.days.length },
      formatOutput: (res) => ({
        reorderOps: res.reorderOps,
        provider: res.provider
      })
    },
    async () => {
      const { reorderOps, reply } = resolveReorderOpsDeterministic(req);
      return {
        intent: "update_itinerary",
        followUpAction: "reorder_or_pace",
        reply,
        shouldOpenPlanner: true,
        preferences: buildBasePreferences(req),
        resetItineraryToTheme: false,
        stopOperations: [],
        reorderOps,
        suggestedTab: "map",
        status: "completed",
        provider: "local-fallback"
      };
    }
  );
}
async function handleCurrentTripQaFollowUp(req, fetchFn, options) {
  return withOpenInferenceSpan(
    "follow_up_current_trip_qa",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, daysCount: req.currentState.days.length },
      formatOutput: (res) => ({ reply: res.reply, provider: res.provider })
    },
    async () => {
      const groundedCtx = await loadGroundedQaContext({
        stays: options?.stays,
        logistics: options?.logistics
      });
      const tavilyCtx = await maybeFetchTavilyQaContext(req.message);
      const deterministicReply = await buildGroundedQaReplyDeterministic(req, {
        stays: options?.stays,
        logistics: options?.logistics,
        tavilySnippets: tavilyCtx.snippets,
        tavilyAnswer: tavilyCtx.answer
      });
      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return {
          intent: "general_qa",
          followUpAction: "current_trip_qa",
          reply: deterministicReply,
          shouldOpenPlanner: false,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: [],
          ...tavilyCtx.citations.length > 0 ? { citations: tavilyCtx.citations } : {},
          status: "completed",
          provider: "local-fallback"
        };
      }
      const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const historySnippet = (req.history || []).slice(-4).map((h) => `User: ${h.user}
Assistant: ${h.reply}`).join("\n");
      const effectiveQaLang = resolveEffectiveQaLanguage(req.message, req.lang);
      const systemText = [
        "You are the Active-Itinerary & Local Knowledge Q&A assistant for \u0110\u1EAFk L\u1EAFk AI Travel Concierge.",
        `UI language: "${req.lang}". Target reply language: "${effectiveQaLang}".`,
        "Answer the user question directly, accurately, and cleanly by synthesizing the grounded local data (`currentDays`, `stays`, `logistics`, `dakLakPlaceDirectory`, `seasonsData`), live web search context (`tavilyLiveWebAnswer`, `tavilySnippets`), and verified \u0110\u1EAFk L\u1EAFk travel knowledge.",
        `CRITICAL LANGUAGE RULE: Write 100% of your reply in ${effectiveQaLang === "vi" ? "natural, fluent Vietnamese" : "natural, fluent English"} matching the user's question. If \`tavilyLiveWebAnswer\` or \`tavilySnippets\` are in English and target language is "vi", ALWAYS translate and synthesize them into natural Vietnamese \u2014 NEVER paste English sentences into a Vietnamese reply.`,
        "READABILITY & FORMATTING RULE: Format your response with clean Markdown for easy scanning: start with a concise 1\u20132 sentence direct answer, then organize key details (prices, schedules, highlights, practical notes) into bullet points (`- **Nh\xE3n**: n\u1ED9i dung`) separated by blank lines.",
        "CRITICAL HONESTY RULES:",
        "- For questions about internal catalog stays/accommodations (amenities like swimming pool/h\u1ED3 b\u01A1i, wifi, breakfast, prices), check `stays` (`name`, `area`, `tier`, `nightlyRateVnd`, `amenities`, `sourceNote`) and any `tavilySnippets`.",
        "- If an asked amenity (e.g. a swimming pool / h\u1ED3 b\u01A1i), opening hour, or policy is NOT listed or confirmed for that stay/place in our dataset or live snippets, state clearly and honestly that it is NOT listed/confirmed in our data, list the actual amenities that ARE recorded, and suggest relevant alternative stays from `stays` that DO list it (e.g. Elephants Hotel Bu\xF4n Ma Thu\u1ED9t or M\u01B0\u1EDDng Thanh Luxury Bu\xF4n Ma Thu\u1ED9t for a pool).",
        "- For general or external questions (e.g. airport transfers, flights/buses, festivals, external attractions, restaurants, cafes, history, culture, weather), provide a helpful, accurate answer using `tavilyLiveWebAnswer`, `tavilySnippets`, and \u0110\u1EAFk L\u1EAFk domain knowledge.",
        "- Do NOT mutate or claim to have modified the active itinerary.",
        "- Never invent nonexistent stops or amenities, and never suggest elephant riding."
      ].join("\n");
      const prompt = [
        `currentState: duration=${req.currentState.duration}, companion=${req.currentState.companion}, budget=${req.currentState.budget}, theme=${req.currentState.theme}`,
        `currentDays:
${JSON.stringify(req.currentState.days)}`,
        `stays:
${JSON.stringify(groundedCtx.stays)}`,
        `logistics:
${JSON.stringify(groundedCtx.logistics)}`,
        `dakLakPlaceDirectory:
${JSON.stringify(groundedCtx.places)}`,
        `seasonsData:
${JSON.stringify(groundedCtx.seasons)}`,
        tavilyCtx.answer ? `tavilyLiveWebAnswer:
${tavilyCtx.answer}` : "",
        tavilyCtx.snippets.length > 0 ? `tavilySnippets:
${JSON.stringify(tavilyCtx.snippets)}` : "",
        historySnippet ? `recentHistory:
${historySnippet}` : "",
        `question: ${req.message}`
      ].filter(Boolean).join("\n\n");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(1e4, AI_CHAT_TIMEOUT_MS));
      try {
        const llmOut = await withOpenInferenceSpan(
          "gemini_follow_up_trip_qa",
          {
            kind: OpenInferenceSpanKind4.LLM,
            input: prompt,
            attributes: {
              [LLM_MODEL_NAME2]: model,
              [LLM_PROVIDER2]: "google",
              [LLM_SYSTEM2]: "gemini"
            },
            formatOutput: (res) => res.rawText
          },
          async () => {
            const response = await fetchFn(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 1200
                }
              })
            });
            if (!response.ok) {
              throw new Error(`Gemini trip_qa HTTP ${response.status}`);
            }
            const data = await response.json();
            const rawText = (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            return { rawText };
          }
        );
        const reply = llmOut.rawText && !hasElephantRidingViolation(llmOut.rawText) ? llmOut.rawText : deterministicReply;
        return {
          intent: "general_qa",
          followUpAction: "current_trip_qa",
          reply,
          shouldOpenPlanner: false,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: [],
          ...tavilyCtx.citations.length > 0 ? { citations: tavilyCtx.citations } : {},
          status: "completed",
          provider: llmOut.rawText ? `gemini-ai:${model}` : "local-fallback"
        };
      } catch {
        return {
          intent: "general_qa",
          followUpAction: "current_trip_qa",
          reply: deterministicReply,
          shouldOpenPlanner: false,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: [],
          ...tavilyCtx.citations.length > 0 ? { citations: tavilyCtx.citations } : {},
          status: "completed",
          provider: "local-fallback"
        };
      } finally {
        clearTimeout(timer);
      }
    }
  );
}
async function routeFollowUp(req, options) {
  return withOpenInferenceSpan(
    "follow_up_router",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: {
        message: req.message,
        daysCount: req.currentState.days.length,
        duration: req.currentState.duration
      },
      formatOutput: (out) => ({
        followUpAction: out.followUpAction,
        handled: out.handled,
        classifierMethod: out.classifierMethod
      })
    },
    async () => {
      const fetchFn = options?.fetchFn ?? fetch;
      const { action, method } = await classifyFollowUpAction(req, options);
      if (action === "full_replan") {
        return {
          followUpAction: "full_replan",
          handled: false,
          classifierMethod: method
        };
      }
      let response;
      switch (action) {
        case "modify_stops":
          response = await handleModifyStopsFollowUp(req, fetchFn);
          break;
        case "adjust_budget":
          response = await handleAdjustBudgetFollowUp(req);
          break;
        case "swap_logistics":
          response = await handleSwapLogisticsFollowUp(req, options);
          break;
        case "reorder_or_pace":
          response = await handleReorderOrPaceFollowUp(req);
          break;
        case "current_trip_qa":
        default:
          response = await handleCurrentTripQaFollowUp(req, fetchFn, options);
          break;
      }
      return {
        followUpAction: action,
        handled: true,
        response,
        classifierMethod: method
      };
    }
  );
}

// server/services/ai/workflow/phase3Budget.ts
import { OpenInferenceSpanKind as OpenInferenceSpanKind5 } from "@arizeai/openinference-semantic-conventions";
var DAILY_FOOD_PER_PERSON_VND = {
  budget: 2e5,
  standard: 34e4,
  luxury: 58e4
};
async function runPhase3Budget(intake, capacityPlan, options) {
  return withOpenInferenceSpan(
    "phase3_budget",
    {
      kind: OpenInferenceSpanKind5.CHAIN,
      input: {
        totalBudgetVnd: intake.totalBudgetVnd,
        budgetTier: intake.budgetTier,
        dayCount: capacityPlan.dayCount,
        travelersCount: capacityPlan.travelersCount
      },
      formatOutput: (res) => ({
        totalBudgetVnd: res.totalBudgetVnd,
        availableActivityBudgetVnd: res.availableActivityBudgetVnd,
        estimatedTotalVnd: res.estimatedTotalVnd,
        feasibleCount: res.feasiblePlaces.length,
        excludedCount: res.excludedOverBudget.length
      })
    },
    () => runPhase3BudgetImpl(intake, capacityPlan, options)
  );
}
async function runPhase3BudgetImpl(intake, capacityPlan, options) {
  const nowMs = options?.nowMs ?? Date.now();
  const totalBudgetVnd = intake.totalBudgetVnd && intake.totalBudgetVnd > 0 ? Math.round(intake.totalBudgetVnd) : Math.round(
    budgetMultipliers[intake.budgetTier].perDay * capacityPlan.dayCount * capacityPlan.travelersCount
  );
  const nights = Math.max(1, capacityPlan.dayCount - 1);
  const roomsNeeded = capacityPlan.selectedStay ? Math.max(
    1,
    Math.ceil(
      capacityPlan.travelersCount / Math.max(1, capacityPlan.selectedStay.capacityMax)
    )
  ) : 1;
  const rawStayVnd = capacityPlan.selectedStay ? capacityPlan.selectedStay.nightlyRateVnd * nights * roomsNeeded : Math.round(totalBudgetVnd * AI_PRICE_POLICY.lodgingShareCapPct / 100);
  const rawTransitVnd = capacityPlan.selectedLogistics ? capacityPlan.selectedLogistics.dailyRateVnd * capacityPlan.dayCount : Math.round(totalBudgetVnd * AI_PRICE_POLICY.transitShareCapPct / 100);
  const contingencyVnd = Math.round(
    totalBudgetVnd * AI_PRICE_POLICY.contingencyBufferPct / 100
  );
  const reservedStayVnd = Math.min(rawStayVnd, Math.round(totalBudgetVnd * 0.55));
  const remainingAfterStay = Math.max(0, totalBudgetVnd - reservedStayVnd - contingencyVnd);
  const reservedTransitVnd = Math.min(rawTransitVnd, Math.round(remainingAfterStay * 0.5));
  const targetFoodVnd = DAILY_FOOD_PER_PERSON_VND[intake.budgetTier] * capacityPlan.travelersCount * capacityPlan.dayCount;
  const remainingAfterTransit = Math.max(
    0,
    totalBudgetVnd - reservedStayVnd - reservedTransitVnd - contingencyVnd
  );
  const reservedFoodVnd = Math.min(targetFoodVnd, Math.round(remainingAfterTransit * 0.6));
  const availableActivityBudgetVnd = Math.max(
    0,
    totalBudgetVnd - reservedStayVnd - reservedTransitVnd - reservedFoodVnd - contingencyVnd
  );
  const enrichedPlaces = options?.places ? options.places.map((p) => ({ ...p })) : await listEnrichedPlaces(AI_PRICE_TTL_HOURS, nowMs);
  const citations = [];
  const disclaimers = [];
  const tavilyLookup = options?.tavilyLookupFn ?? searchPlacePriceWithTavily;
  const canRunTavily = !options?.forceSkipTavily && (Boolean(TAVILY_API_KEY.trim()) || Boolean(options?.tavilyLookupFn));
  const stalePlaces = enrichedPlaces.filter((p) => p.isStale).sort((a, b) => {
    const aMatch = a.themeTags.includes(intake.mainPurpose) ? 1 : 0;
    const bMatch = b.themeTags.includes(intake.mainPurpose) ? 1 : 0;
    return bMatch - aMatch;
  }).slice(0, 4);
  let usedEstimateFallback = false;
  const isEn = options?.lang === "en";
  if (!canRunTavily) {
    if (stalePlaces.length > 0) {
      usedEstimateFallback = true;
    }
  } else if (stalePlaces.length > 0) {
    const refreshResults = await Promise.all(
      stalePlaces.map(async (stale) => {
        try {
          const refreshed = await tavilyLookup(stale.title, stale.areaCluster, {
            fallbackTicketVnd: stale.ticketVnd,
            fallbackEstimatedSpendVnd: stale.estimatedSpendVnd
          });
          return { stale, refreshed };
        } catch {
          return { stale, refreshed: null };
        }
      })
    );
    for (const { stale, refreshed } of refreshResults) {
      if (refreshed) {
        stale.ticketVnd = refreshed.ticketVnd;
        stale.estimatedSpendVnd = refreshed.estimatedSpendVnd;
        stale.priceSource = "tavily";
        stale.priceNote = refreshed.priceNote;
        stale.sourceUrl = refreshed.sourceUrl;
        stale.fetchedAt = new Date(nowMs).toISOString();
        stale.isStale = false;
        if (!options?.skipSqliteUpsert) {
          await upsertPlacePrice({
            placeTitle: stale.title,
            areaCluster: stale.areaCluster,
            ticketVnd: refreshed.ticketVnd,
            estimatedSpendVnd: refreshed.estimatedSpendVnd,
            priceSource: "tavily",
            priceNote: refreshed.priceNote,
            sourceUrl: refreshed.sourceUrl,
            fetchedAt: stale.fetchedAt
          });
        }
        for (const c of refreshed.citations) {
          if (!citations.some((existing) => existing.url === c.url)) {
            citations.push(c);
          }
        }
      } else {
        usedEstimateFallback = true;
      }
    }
  }
  if (usedEstimateFallback || enrichedPlaces.some((p) => p.priceSource === "estimated")) {
    disclaimers.push(
      isEn ? "Some attraction ticket/activity costs use internal reference estimates while live online data is unavailable." : "M\u1ED9t s\u1ED1 gi\xE1 v\xE9/chi ph\xED tham quan d\xF9ng m\u1EE9c \u01B0\u1EDBc t\xEDnh tham chi\u1EBFu n\u1ED9i b\u1ED9 do d\u1EEF li\u1EC7u tr\u1EF1c tuy\u1EBFn ch\u01B0a kh\u1EA3 d\u1EE5ng."
    );
  }
  const feasiblePlaces = [];
  const excludedOverBudget = [];
  for (const place of enrichedPlaces) {
    const groupCostVnd = place.estimatedSpendVnd * capacityPlan.travelersCount;
    const item = {
      title: place.title,
      location: place.location,
      areaCluster: place.areaCluster,
      themeTags: place.themeTags,
      ticketVnd: place.ticketVnd,
      estimatedSpendVnd: place.estimatedSpendVnd,
      priceSource: place.priceSource,
      priceNote: place.priceNote,
      sourceUrl: place.sourceUrl,
      fetchedAt: place.fetchedAt,
      isStale: place.isStale
    };
    if (groupCostVnd > availableActivityBudgetVnd && groupCostVnd > 0) {
      excludedOverBudget.push({
        ...item,
        reason: isEn ? `Estimated cost for ${capacityPlan.travelersCount} guests (${groupCostVnd.toLocaleString("en-US")} VND) exceeds remaining activity budget (${availableActivityBudgetVnd.toLocaleString("en-US")} VND).` : `Chi ph\xED \u01B0\u1EDBc t\xEDnh cho ${capacityPlan.travelersCount} kh\xE1ch (${groupCostVnd.toLocaleString(
          "vi-VN"
        )}\u0111) v\u01B0\u1EE3t ng\xE2n s\xE1ch ho\u1EA1t \u0111\u1ED9ng c\xF2n l\u1EA1i (${availableActivityBudgetVnd.toLocaleString("vi-VN")}\u0111).`
      });
    } else if (availableActivityBudgetVnd > 0 && capacityPlan.maxStopsTotal >= 3 && groupCostVnd > availableActivityBudgetVnd * 0.75 && place.estimatedSpendVnd >= 4e5) {
      excludedOverBudget.push({
        ...item,
        reason: isEn ? `High activity cost (${groupCostVnd.toLocaleString("en-US")} VND) would consume >75% of the activity budget, leaving insufficient room for other stops.` : `Chi ph\xED ho\u1EA1t \u0111\u1ED9ng cao (${groupCostVnd.toLocaleString(
          "vi-VN"
        )}\u0111) s\u1EBD chi\u1EBFm >75% qu\u1EF9 tham quan, c\u1EA7n gi\u1EEF c\xE2n \u0111\u1ED1i cho c\xE1c \u0111i\u1EC3m kh\xE1c.`
      });
    } else {
      feasiblePlaces.push(item);
    }
  }
  const lowestStopsCost = [...feasiblePlaces].sort((a, b) => a.estimatedSpendVnd - b.estimatedSpendVnd).slice(0, Math.min(capacityPlan.maxStopsTotal, feasiblePlaces.length)).reduce((sum, p) => sum + p.estimatedSpendVnd * capacityPlan.travelersCount, 0);
  const estimatedTotalVnd = reservedStayVnd + reservedTransitVnd + reservedFoodVnd + contingencyVnd + Math.min(lowestStopsCost, availableActivityBudgetVnd);
  const isWithinBudget = estimatedTotalVnd <= totalBudgetVnd;
  if (!isWithinBudget) {
    disclaimers.push(
      isEn ? `Minimum estimated total (${estimatedTotalVnd.toLocaleString("en-US")} VND) slightly exceeds target budget (${totalBudgetVnd.toLocaleString("en-US")} VND).` : `T\u1ED5ng d\u1EF1 to\xE1n t\u1ED1i thi\u1EC3u (${estimatedTotalVnd.toLocaleString(
        "vi-VN"
      )}\u0111) \u0111ang nh\u1EC9nh h\u01A1n ng\xE2n s\xE1ch m\u1EE5c ti\xEAu (${totalBudgetVnd.toLocaleString("vi-VN")}\u0111).`
    );
  }
  return {
    totalBudgetVnd,
    budgetTier: intake.budgetTier,
    reservedStayVnd,
    reservedTransitVnd,
    reservedFoodVnd,
    contingencyVnd,
    availableActivityBudgetVnd,
    estimatedTotalVnd,
    isWithinBudget,
    feasiblePlaces,
    excludedOverBudget,
    citations,
    disclaimers
  };
}

// server/services/ai/workflow/phase4Purpose.ts
import { OpenInferenceSpanKind as OpenInferenceSpanKind6, SemanticConventions as SemanticConventions4 } from "@arizeai/openinference-semantic-conventions";
var SEASONAL_PLACE_BOOSTS = [
  {
    keyword: "th\xE1ng 7",
    placeTitle: "Th\xE1c Dray Nur H\xF9ng V\u0129",
    boost: 26,
    reason: "M\xF9a m\u01B0a r\u1EEBng (T7\u2013T9) gi\xFAp th\xE1c Dray Nur \u0111\u1EA1t l\u01B0u l\u01B0\u1EE3ng n\u01B0\u1EDBc h\xF9ng v\u0129 nh\u1EA5t."
  },
  {
    keyword: "m\xF9a thu",
    placeTitle: "Th\xE1c Dray Nur H\xF9ng V\u0129",
    boost: 26,
    reason: "Cao \u0111i\u1EC3m m\xF9a th\xE1c n\u01B0\u1EDBc T\xE2y Nguy\xEAn (T7\u2013T9)."
  },
  {
    keyword: "th\xE1ng 10",
    placeTitle: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n",
    boost: 26,
    reason: "M\xF9a thu ho\u1EA1ch tr\xE1i c\xE0 ph\xEA ch\xEDn \u0111\u1ECF (T10\u2013T12) r\u1EA5t h\u1EE3p tr\u1EA3i nghi\u1EC7m h\xE1i & cupping."
  },
  {
    keyword: "m\xF9a \u0111\xF4ng",
    placeTitle: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n",
    boost: 26,
    reason: "M\xF9a d\xE3 qu\u1EF3 & thu ho\u1EA1ch c\xE0 ph\xEA ch\xEDn \u0111\u1ECF (T10\u2013T12)."
  },
  {
    keyword: "m\xF9a \u0111\xF4ng",
    placeTitle: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA",
    boost: 16,
    reason: "Ph\xF9 h\u1EE3p h\xE0nh tr\xECnh ch\u1EE7 \u0111\u1EC1 thu ho\u1EA1ch c\xE0 ph\xEA cu\u1ED1i n\u0103m."
  },
  {
    keyword: "m\xF9a xu\xE2n",
    placeTitle: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng",
    boost: 18,
    reason: "M\xF9a xu\xE2n hoa c\xE0 ph\xEA tr\u1EAFng & kh\xF4ng kh\xED l\u1EC5 h\u1ED9i c\u1ED3ng chi\xEAng \u0111\u1EA7u n\u0103m."
  },
  {
    keyword: "m\xF9a h\u1EA1",
    placeTitle: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun",
    boost: 22,
    reason: "N\u1EAFng cao nguy\xEAn r\u1EF1c r\u1EE1 (T4\u2013T6), l\xFD t\u01B0\u1EDFng ch\xE8o thuy\u1EC1n \u0111\u1ED9c m\u1ED9c H\u1ED3 L\u1EAFk."
  }
];
function scorePlaceDeterministically(place, intake, capacityPlan, lang = "vi") {
  let score = 20;
  const matchReasons = [];
  const isEn = lang === "en";
  if (place.themeTags[0] === intake.mainPurpose) {
    score += 40;
    matchReasons.push(
      isEn ? `Primary ${intake.mainPurpose} theme highlight` : `Tr\u1ECDng t\xE2m ch\u1EE7 \u0111\u1EC1 ${intake.mainPurpose}`
    );
  } else if (place.themeTags.includes(intake.mainPurpose)) {
    score += 24;
    matchReasons.push(
      isEn ? `Fits ${intake.mainPurpose} theme` : `Ph\xF9 h\u1EE3p ch\u1EE7 \u0111\u1EC1 ${intake.mainPurpose}`
    );
  }
  if (place.themeTags.includes(capacityPlan.seasonTheme)) {
    score += 14;
    matchReasons.push(
      isEn ? `Matches ${capacityPlan.seasonHeadline} season` : `H\u1EE3p m\xF9a ${capacityPlan.seasonHeadline}`
    );
  }
  const seasonHay = `${capacityPlan.seasonMilestone} ${capacityPlan.seasonHeadline}`.toLowerCase();
  for (const rule of SEASONAL_PLACE_BOOSTS) {
    if (seasonHay.includes(rule.keyword) && place.title === rule.placeTitle) {
      score += rule.boost;
      matchReasons.push(rule.reason);
    }
  }
  const placeHay = `${place.title} ${place.location} ${place.areaCluster}`.toLowerCase();
  for (const interest of intake.secondaryInterests) {
    const clean = interest.toLowerCase().trim();
    if (clean.length >= 2 && placeHay.includes(clean)) {
      score += 12;
      matchReasons.push(
        isEn ? `Matches secondary interest "${interest}"` : `Kh\u1EDBp s\u1EDF th\xEDch ph\u1EE5 "${interest}"`
      );
    }
  }
  if (intake.budgetTier === "budget" && place.estimatedSpendVnd <= 15e4) {
    score += 8;
    matchReasons.push(
      isEn ? "Budget-friendly cost, easy to balance overall budget" : "Chi ph\xED ti\u1EBFt ki\u1EC7m, d\u1EC5 c\xE2n \u0111\u1ED1i ng\xE2n s\xE1ch"
    );
  }
  if (place.areaCluster === "BMT") {
    score += 5;
  }
  return {
    ...place,
    score,
    matchReasons
  };
}
async function applyGeminiDecisionsBatchScoring(ranked, intake, capacityPlan, fetchFn = fetch) {
  const decisionModel = GEMINI_DECISION_MODEL.trim();
  const apiKey = GEMINI_API_KEY.trim();
  if (!decisionModel || !apiKey || ranked.length === 0) {
    return { scored: ranked, usedDecisionsApi: false };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5e3);
  try {
    const questions = {};
    ranked.forEach((place, idx) => {
      questions[`place_${idx}`] = {
        type: "score",
        instructions: `Rate how well "${place.title}" (${place.areaCluster}, tags=${place.themeTags.join(
          ","
        )}, spend=${place.estimatedSpendVnd} VND) fits this trip.`,
        legend: [
          "Weak fit for user goal or season",
          "Moderate supporting stop",
          "Strong thematic & seasonal fit",
          "Top must-visit highlight for this traveler"
        ]
      };
    });
    const inputText = [
      `Goal: ${intake.rawUserGoal || intake.mainPurpose}`,
      `Main purpose: ${intake.mainPurpose}`,
      `Secondary interests: ${intake.secondaryInterests.join(", ") || "none"}`,
      `Companion: ${capacityPlan.companionType} (${capacityPlan.travelersCount} pax)`,
      `Duration: ${capacityPlan.dayCount} days`,
      `Season: ${capacityPlan.seasonHeadline}`
    ].join("\n");
    const response = await fetchFn("https://generativelanguage.googleapis.com/v1beta/decisions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: decisionModel,
        input: inputText,
        questions
      })
    });
    if (!response.ok) {
      return { scored: ranked, usedDecisionsApi: false };
    }
    const data = await response.json();
    if (!data.answers) {
      return { scored: ranked, usedDecisionsApi: false };
    }
    const updated = ranked.map((place, idx) => {
      const ans = data.answers?.[`place_${idx}`];
      const rawScore = typeof ans?.score === "number" ? ans.score : typeof ans?.expectedScore === "number" ? ans.expectedScore : null;
      if (rawScore === null) return place;
      const bonus = Math.round(Math.max(0, Math.min(3, rawScore)) * 10);
      return {
        ...place,
        score: place.score + bonus,
        matchReasons: [...place.matchReasons, `Gemini Decisions score +${bonus}`]
      };
    });
    return { scored: updated, usedDecisionsApi: true };
  } catch {
    return { scored: ranked, usedDecisionsApi: false };
  } finally {
    clearTimeout(timer);
  }
}
async function runPhase4Purpose(intake, capacityPlan, budgetResult, options) {
  return withOpenInferenceSpan(
    "phase4_purpose",
    {
      kind: OpenInferenceSpanKind6.CHAIN,
      input: {
        mainPurpose: intake.mainPurpose,
        secondaryInterests: intake.secondaryInterests,
        feasiblePlacesCount: budgetResult.feasiblePlaces.length,
        maxStopsTotal: capacityPlan.maxStopsTotal
      },
      formatOutput: (res) => ({
        scoringMethod: res.scoringMethod,
        selectedPlaces: res.selectedPlaces.map((p) => p.title),
        areaClustersUsed: res.areaClustersUsed,
        storySlugs: res.relevantPosts.map((p) => p.slug)
      })
    },
    async () => {
      const pinnedNormalized = (options?.pinnedPlaces || []).map((p) => p.trim().toLowerCase()).filter((p) => p.length >= 2);
      const isPinnedPlace = (place) => {
        if (pinnedNormalized.length === 0) return false;
        const t = place.title.toLowerCase();
        return pinnedNormalized.some((pin) => t === pin || t.includes(pin) || pin.includes(t));
      };
      const initialRanked = budgetResult.feasiblePlaces.map((place) => {
        const base = scorePlaceDeterministically(place, intake, capacityPlan, options?.lang || "vi");
        if (isPinnedPlace(place)) {
          return {
            ...base,
            score: base.score + 120,
            matchReasons: [
              options?.lang === "en" ? "Saved in user Trip Backpack (must-include)" : "\u0110i\u1EC3m \u0111\u1EBFn ng\u01B0\u1EDDi d\xF9ng \u0111\xE3 l\u01B0u trong Balo H\xE0nh Tr\xECnh (\u01B0u ti\xEAn gi\u1EEF)",
              ...base.matchReasons
            ]
          };
        }
        return base;
      });
      const { scored, usedDecisionsApi } = await applyGeminiDecisionsBatchScoring(
        initialRanked,
        intake,
        capacityPlan,
        options?.fetchFn
      );
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.estimatedSpendVnd - b.estimatedSpendVnd;
      });
      const outerClusterScores = /* @__PURE__ */ new Map();
      const pinnedClusters = /* @__PURE__ */ new Set();
      for (const item of scored) {
        if (isPinnedPlace(item)) {
          pinnedClusters.add(item.areaCluster);
        }
        if (item.areaCluster !== "BMT" && item.areaCluster !== "Ea Kao") {
          const prev = outerClusterScores.get(item.areaCluster) || 0;
          if (item.score > prev) outerClusterScores.set(item.areaCluster, item.score);
        }
      }
      const rankedOuterClusters = Array.from(outerClusterScores.entries()).sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);
      const maxOuterClusters = capacityPlan.dayCount <= 2 ? 1 : capacityPlan.dayCount === 3 ? 2 : 3;
      const allowedClusters = /* @__PURE__ */ new Set([
        "BMT",
        "Ea Kao",
        ...pinnedClusters,
        ...rankedOuterClusters.slice(0, maxOuterClusters)
      ]);
      const selectedPlaces = [];
      const backupPlaces = [];
      let remainingActivityBudget = budgetResult.availableActivityBudgetVnd;
      for (const item of scored) {
        const groupCost = item.estimatedSpendVnd * capacityPlan.travelersCount;
        const pinned = isPinnedPlace(item);
        if (selectedPlaces.length < capacityPlan.maxStopsTotal && allowedClusters.has(item.areaCluster) && (pinned || groupCost <= remainingActivityBudget)) {
          selectedPlaces.push(item);
          remainingActivityBudget = Math.max(0, remainingActivityBudget - groupCost);
        } else {
          backupPlaces.push(item);
        }
      }
      if (selectedPlaces.length < Math.min(capacityPlan.maxStopsTotal, scored.length)) {
        const stillRemaining = [];
        for (const item of backupPlaces) {
          const groupCost = item.estimatedSpendVnd * capacityPlan.travelersCount;
          if (selectedPlaces.length < capacityPlan.maxStopsTotal && groupCost <= remainingActivityBudget) {
            selectedPlaces.push(item);
            remainingActivityBudget -= groupCost;
          } else {
            stillRemaining.push(item);
          }
        }
        backupPlaces.length = 0;
        backupPlaces.push(...stillRemaining);
      }
      const areaClustersUsed = Array.from(new Set(selectedPlaces.map((p) => p.areaCluster)));
      const queryPosts = options?.queryPostsFn ?? queryRelevantPublishedPosts;
      const queryParams = {
        lang: options?.lang || "vi",
        themeKey: intake.mainPurpose,
        locations: areaClustersUsed,
        limit: 4
      };
      const posts = await withOpenInferenceSpan(
        "cms_editorial_retriever",
        {
          kind: OpenInferenceSpanKind6.RETRIEVER,
          input: queryParams,
          formatOutput: (docs) => docs.map((d) => ({ slug: d.slug, title: d.title })),
          onSuccess: (span, docs) => {
            docs.forEach((doc, idx) => {
              span.setAttribute(
                `${SemanticConventions4.RETRIEVAL_DOCUMENTS}.${idx}.${SemanticConventions4.DOCUMENT_ID}`,
                doc.slug
              );
              span.setAttribute(
                `${SemanticConventions4.RETRIEVAL_DOCUMENTS}.${idx}.${SemanticConventions4.DOCUMENT_CONTENT}`,
                `${doc.title}: ${doc.excerpt}`
              );
              span.setAttribute(
                `${SemanticConventions4.RETRIEVAL_DOCUMENTS}.${idx}.${SemanticConventions4.DOCUMENT_METADATA}`,
                JSON.stringify({ category: doc.category, location: doc.location, themeKey: doc.themeKey })
              );
            });
          }
        },
        async () => await queryPosts(queryParams)
      );
      const relevantPosts = posts.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        category: p.category,
        location: p.location,
        excerpt: p.excerpt,
        themeKey: p.themeKey
      }));
      return {
        mainPurpose: intake.mainPurpose,
        selectedPlaces,
        backupPlaces,
        areaClustersUsed,
        relevantPosts,
        scoringMethod: usedDecisionsApi ? "gemini_decisions" : "deterministic"
      };
    }
  );
}

// server/services/ai/workflow/phase5Synthesis.ts
import {
  LLM_MODEL_NAME as LLM_MODEL_NAME3,
  LLM_PROVIDER as LLM_PROVIDER3,
  LLM_SYSTEM as LLM_SYSTEM3,
  LLM_TOKEN_COUNT_COMPLETION as LLM_TOKEN_COUNT_COMPLETION3,
  LLM_TOKEN_COUNT_PROMPT as LLM_TOKEN_COUNT_PROMPT3,
  LLM_TOKEN_COUNT_TOTAL as LLM_TOKEN_COUNT_TOTAL3,
  OpenInferenceSpanKind as OpenInferenceSpanKind7,
  SemanticConventions as SemanticConventions5
} from "@arizeai/openinference-semantic-conventions";
function buildGroundedCitations(budgetResult, purposeSelection) {
  const citations = [];
  for (const c of budgetResult.citations) {
    if (!citations.some((x) => x.url === c.url)) {
      citations.push(c);
    }
  }
  for (const post of purposeSelection.relevantPosts) {
    const url = `/blog/${post.slug}`;
    if (!citations.some((x) => x.url === url)) {
      citations.push({
        title: post.title,
        url,
        snippet: post.excerpt,
        source: "cms"
      });
    }
  }
  return citations;
}
function formatStayMoveText(capacityPlan, lang) {
  const isEn = lang === "en";
  const stayText = capacityPlan.selectedStay ? isEn ? `${capacityPlan.selectedStay.name} (${capacityPlan.selectedStay.area} \u2022 ~${capacityPlan.selectedStay.nightlyRateVnd.toLocaleString(
    "en-US"
  )} VND/night)` : `${capacityPlan.selectedStay.name} (${capacityPlan.selectedStay.area} \u2022 ~${capacityPlan.selectedStay.nightlyRateVnd.toLocaleString(
    "vi-VN"
  )}\u0111/\u0111\xEAm)` : budgetMultipliers[capacityPlan.recommendedStays[0]?.tier || "standard"].stayMove;
  const transitText = capacityPlan.selectedLogistics ? isEn ? `${capacityPlan.selectedLogistics.label} (~${capacityPlan.selectedLogistics.dailyRateVnd.toLocaleString(
    "en-US"
  )} VND/day)` : `${capacityPlan.selectedLogistics.label} (~${capacityPlan.selectedLogistics.dailyRateVnd.toLocaleString(
    "vi-VN"
  )}\u0111/ng\xE0y)` : "";
  return [stayText, transitText].filter(Boolean).join(" \u2022 ");
}
function distributePlacesAcrossDays(selectedPlaces, dayCount) {
  const buckets = Array.from({ length: dayCount }, () => []);
  if (selectedPlaces.length === 0) return buckets;
  const bmtPlaces = selectedPlaces.filter(
    (p) => p.areaCluster === "BMT" || p.areaCluster === "Ea Kao"
  );
  const outerByCluster = /* @__PURE__ */ new Map();
  for (const p of selectedPlaces) {
    if (p.areaCluster !== "BMT" && p.areaCluster !== "Ea Kao") {
      const list = outerByCluster.get(p.areaCluster) || [];
      list.push(p);
      outerByCluster.set(p.areaCluster, list);
    }
  }
  const ordered = [
    ...bmtPlaces,
    ...Array.from(outerByCluster.values()).flat()
  ];
  let idx = 0;
  for (let d = 0; d < dayCount; d++) {
    const remainingDays = dayCount - d;
    const remainingItems = ordered.length - idx;
    const take = Math.max(0, Math.ceil(remainingItems / remainingDays));
    buckets[d] = ordered.slice(idx, idx + take);
    idx += take;
  }
  return buckets;
}
function toSlotPlan(place, slotIndex, lang = "vi") {
  const meta = dakLakPlaceDirectory.find(
    (d) => d.title.toLowerCase() === place.title.toLowerCase()
  );
  const isEn = lang === "en";
  const timeDefaults = [
    { time: "08:00 \u2013 10:00", period: isEn ? "Morning" : "Bu\u1ED5i s\xE1ng" },
    { time: "10:30 \u2013 12:00", period: isEn ? "Late morning" : "Gi\u1EEFa s\xE1ng" },
    { time: "14:30 \u2013 16:45", period: isEn ? "Afternoon" : "Bu\u1ED5i chi\u1EC1u" },
    { time: "18:30 \u2013 20:30", period: isEn ? "Evening" : "Bu\u1ED5i t\u1ED1i" }
  ];
  const fallbackTiming = timeDefaults[Math.min(slotIndex, timeDefaults.length - 1)];
  return {
    time: meta?.time || fallbackTiming.time,
    period: meta?.period || fallbackTiming.period,
    title: place.title,
    location: place.location,
    desc: meta?.desc || place.matchReasons.join(". ") || (isEn ? `Explore ${place.title}.` : `Kh\xE1m ph\xE1 ${place.title}.`),
    isCustom: false,
    areaCluster: place.areaCluster,
    x: meta?.x,
    y: meta?.y,
    lat: meta?.lat,
    lng: meta?.lng,
    googleMapsQuery: meta?.googleMapsQuery,
    category: meta?.category,
    duration: meta?.duration,
    estimatedCostVnd: place.estimatedSpendVnd
  };
}
function computeTotalEstimatedKm(days) {
  const allSlots = days.flatMap((d) => d.slots);
  if (allSlots.length < 2) return 15;
  let total = 0;
  for (let i = 1; i < allSlots.length; i++) {
    total += computeLegMetrics(
      {
        title: allSlots[i - 1].title,
        location: allSlots[i - 1].location,
        x: allSlots[i - 1].x ?? 378,
        y: allSlots[i - 1].y ?? 196,
        lat: allSlots[i - 1].lat,
        lng: allSlots[i - 1].lng
      },
      {
        title: allSlots[i].title,
        location: allSlots[i].location,
        x: allSlots[i].x ?? 378,
        y: allSlots[i].y ?? 196,
        lat: allSlots[i].lat,
        lng: allSlots[i].lng
      }
    ).dist;
  }
  return Math.round(total);
}
function synthesizeDeterministicPlan(req, intake, capacityPlan, budgetResult, purposeSelection, provider = "local-fallback") {
  const cat = plannerCatalog[intake.mainPurpose];
  const dayBuckets = distributePlacesAcrossDays(
    purposeSelection.selectedPlaces,
    capacityPlan.dayCount
  );
  const isEn = req.lang === "en";
  const generatedDays = dayBuckets.map((places, dIdx) => {
    const clusters = Array.from(new Set(places.map((p) => p.areaCluster)));
    const slots = places.map((place, sIdx) => toSlotPlan(place, sIdx, req.lang));
    let dayKm = 0;
    for (let i = 1; i < slots.length; i++) {
      dayKm += computeLegMetrics(
        {
          title: slots[i - 1].title,
          location: slots[i - 1].location,
          x: slots[i - 1].x ?? 378,
          y: slots[i - 1].y ?? 196,
          lat: slots[i - 1].lat,
          lng: slots[i - 1].lng
        },
        {
          title: slots[i].title,
          location: slots[i].location,
          x: slots[i].x ?? 378,
          y: slots[i].y ?? 196,
          lat: slots[i].lat,
          lng: slots[i].lng
        }
      ).dist;
    }
    const dayLabel = req.lang === "en" ? `Day ${dIdx + 1}` : `Ng\xE0y ${dIdx + 1}`;
    const clusterSummary = clusters.length > 0 ? clusters.join(" \u2192 ") : "Bu\xF4n Ma Thu\u1ED9t";
    const dayTitle = cat.days[dIdx]?.title || (req.lang === "en" ? `Exploring ${clusterSummary}` : `Kh\xE1m ph\xE1 c\u1EE5m \u0111i\u1EC3m ${clusterSummary}`);
    return {
      day: dayLabel,
      title: dayTitle,
      area: `${clusterSummary} \u2022 ~${Math.round(Math.max(8, dayKm))} km`,
      slots
    };
  });
  const activitySum = purposeSelection.selectedPlaces.reduce(
    (sum, p) => sum + p.estimatedSpendVnd * capacityPlan.travelersCount,
    0
  );
  const nights = Math.max(1, capacityPlan.dayCount - 1);
  const generatedExpenses = [
    {
      id: "exp-stay",
      title: capacityPlan.selectedStay ? isEn ? `Stay (${nights} nights) \u2022 ${capacityPlan.selectedStay.name}` : `L\u01B0u tr\xFA ${nights} \u0111\xEAm \u2022 ${capacityPlan.selectedStay.name}` : isEn ? `Stay (${nights} nights)` : `L\u01B0u tr\xFA ${nights} \u0111\xEAm`,
      cat: "stay",
      amount: budgetResult.reservedStayVnd
    },
    {
      id: "exp-transit",
      title: capacityPlan.selectedLogistics ? isEn ? `Transport (${capacityPlan.dayCount} days) \u2022 ${capacityPlan.selectedLogistics.label}` : `Di chuy\u1EC3n ${capacityPlan.dayCount} ng\xE0y \u2022 ${capacityPlan.selectedLogistics.label}` : isEn ? `Transport (${capacityPlan.dayCount} days)` : `Di chuy\u1EC3n ${capacityPlan.dayCount} ng\xE0y`,
      cat: "transit",
      amount: budgetResult.reservedTransitVnd
    },
    {
      id: "exp-food",
      title: isEn ? `Local cuisine & specialty coffee (${capacityPlan.travelersCount} guests)` : `\u1EA8m th\u1EF1c b\u1EA3n \u0111\u1ECBa & c\xE0 ph\xEA (${capacityPlan.travelersCount} kh\xE1ch)`,
      cat: "food",
      amount: budgetResult.reservedFoodVnd
    },
    {
      id: "exp-act",
      title: isEn ? "Admission tickets, experiences & contingency" : "V\xE9 tham quan, tr\u1EA3i nghi\u1EC7m & d\u1EF1 ph\xF2ng",
      cat: "activity",
      amount: Math.min(
        budgetResult.availableActivityBudgetVnd + budgetResult.contingencyVnd,
        activitySum + budgetResult.contingencyVnd
      )
    }
  ];
  const citations = buildGroundedCitations(budgetResult, purposeSelection);
  const totalEstimatedKm = computeTotalEstimatedKm(generatedDays);
  const tips = [
    ...capacityPlan.notes,
    ...budgetResult.disclaimers,
    req.lang === "en" ? "Always choose ethical, non-riding elephant observation tours in Yok \u0110\xF4n National Park." : "\u01AFu ti\xEAn tr\u1EA3i nghi\u1EC7m \u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn kh\xF4ng c\u01B0\u1EE1i voi t\u1EA1i V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n."
  ].filter(Boolean);
  const itineraryMeta = {
    title: cat.title,
    stayMove: formatStayMoveText(capacityPlan, req.lang),
    routeTip: req.lang === "en" ? `Clustered route across ${purposeSelection.areaClustersUsed.join(", ") || "BMT"} (~${totalEstimatedKm} km total) to avoid backtracking.` : `Tuy\u1EBFn gom c\u1EE5m ${purposeSelection.areaClustersUsed.join(" \u2192 ") || "BMT"} (~${totalEstimatedKm} km t\u1ED5ng tuy\u1EBFn), h\u1EA1n ch\u1EBF quay \u0111\u1EA7u.`,
    tips: tips.slice(0, 4),
    hiddenGem: cat.hiddenGem,
    totalEstimatedKm
  };
  const companionText = companionLabels[capacityPlan.companionType];
  const themeText = themeLabels[intake.mainPurpose];
  const excludedCount = budgetResult.excludedOverBudget.length;
  const reply = req.lang === "en" ? `Created your ${intake.duration} ${themeText} itinerary for ${capacityPlan.travelersCount} traveler(s) (${companionText}) during ${capacityPlan.seasonHeadline}, keeping within ~${budgetResult.totalBudgetVnd.toLocaleString("en-US")} VND across ${purposeSelection.selectedPlaces.length} curated stops.${excludedCount > 0 ? ` Filtered out ${excludedCount} over-budget option(s) to stay within your limit.` : ""}` : `M\xECnh \u0111\xE3 thi\u1EBFt k\u1EBF l\u1ECBch tr\xECnh ${intake.duration} (${themeText}) cho ${capacityPlan.travelersCount} kh\xE1ch (${companionText}) v\xE0o ${capacityPlan.seasonHeadline}, t\u1ED1i \u01B0u trong ng\xE2n s\xE1ch ~${budgetResult.totalBudgetVnd.toLocaleString("vi-VN")}\u0111 v\u1EDBi ${purposeSelection.selectedPlaces.length} \u0111i\u1EC3m d\u1EEBng ch\u1ECDn l\u1ECDc.${excludedCount > 0 ? ` \u0110\xE3 l\u1ECDc b\u1EDBt ${excludedCount} \u0111i\u1EC3m v\u01B0\u1EE3t qu\u1EF9 ho\u1EA1t \u0111\u1ED9ng \u0111\u1EC3 gi\u1EEF t\u1ED5ng chi ph\xED an to\xE0n.` : ""}`;
  return {
    intent: "update_itinerary",
    reply,
    shouldOpenPlanner: true,
    preferences: {
      theme: intake.mainPurpose,
      duration: intake.duration,
      companion: capacityPlan.companionType,
      budget: intake.budgetTier
    },
    resetItineraryToTheme: true,
    stopOperations: [],
    suggestedTab: "map",
    provider,
    status: "completed",
    itineraryMeta,
    generatedDays,
    generatedExpenses,
    citations
  };
}
var PHASE5_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    itineraryMeta: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        stayMove: { type: "STRING" },
        routeTip: { type: "STRING" },
        tips: { type: "ARRAY", items: { type: "STRING" } },
        hiddenGem: { type: "STRING" }
      },
      required: ["title", "stayMove", "routeTip", "tips"]
    },
    generatedDays: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "STRING" },
          title: { type: "STRING" },
          area: { type: "STRING" },
          slots: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                time: { type: "STRING" },
                period: { type: "STRING" },
                title: { type: "STRING" },
                location: { type: "STRING" },
                desc: { type: "STRING" },
                areaCluster: { type: "STRING" },
                estimatedCostVnd: { type: "INTEGER" }
              },
              required: ["time", "period", "title", "location", "desc"]
            }
          }
        },
        required: ["day", "title", "area", "slots"]
      }
    },
    generatedExpenses: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          cat: { type: "STRING", enum: ["stay", "transit", "food", "activity"] },
          amount: { type: "INTEGER" },
          note: { type: "STRING" }
        },
        required: ["title", "cat", "amount"]
      }
    },
    suggestedTab: { type: "STRING", enum: ["map", "schedule", "tips"] }
  },
  required: ["reply", "itineraryMeta", "generatedDays", "generatedExpenses"]
};
async function runPhase5Synthesis(req, intake, capacityPlan, budgetResult, purposeSelection, retryFeedback) {
  return withOpenInferenceSpan(
    "phase5_synthesis",
    {
      kind: OpenInferenceSpanKind7.CHAIN,
      input: {
        mainPurpose: intake.mainPurpose,
        dayCount: capacityPlan.dayCount,
        selectedPlacesCount: purposeSelection.selectedPlaces.length,
        totalBudgetVnd: budgetResult.totalBudgetVnd,
        retryFeedback: retryFeedback || []
      },
      formatOutput: (res) => ({
        reply: res.reply,
        daysCount: res.generatedDays?.length || 0,
        expensesCount: res.generatedExpenses?.length || 0,
        provider: res.provider
      })
    },
    async () => {
      const deterministic = synthesizeDeterministicPlan(
        req,
        intake,
        capacityPlan,
        budgetResult,
        purposeSelection
      );
      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return deterministic;
      }
      const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const allowedPlacesJson = purposeSelection.selectedPlaces.map((p) => ({
        title: p.title,
        location: p.location,
        areaCluster: p.areaCluster,
        estimatedSpendVndPerPerson: p.estimatedSpendVnd,
        reasons: p.matchReasons
      }));
      const systemText = [
        'You are Phase 5 Synthesis for "\u0110\u1EAFk L\u1EAFk AI Travel Concierge".',
        `Language: "${req.lang}". Write all user-facing strings in ${req.lang === "en" ? "English" : "Vietnamese"}.`,
        "STRICT GROUNDING RULES:",
        `1. Create exactly ${capacityPlan.dayCount} days in generatedDays.`,
        '2. Every slot.title in generatedDays MUST use an EXACT "title" from ALLOWED_SELECTED_PLACES below. Do NOT invent new stop names.',
        `3. Total stops across all days MUST NOT exceed ${capacityPlan.maxStopsTotal}.`,
        `4. Keep each day within ${capacityPlan.maxDailyDistanceKm} km by grouping same/adjacent areaCluster stops on the same day.`,
        `5. Sum of generatedExpenses.amount MUST NOT exceed ${budgetResult.totalBudgetVnd} VND.`,
        "6. ETHICAL POLICY: NEVER recommend elephant riding; if Yok \u0110\xF4n is included, describe ethical non-riding walking observation only.",
        "7. Keep reply concise, warm, plain text (no markdown tables/HTML).",
        '8. If userGoal includes any specific question or concern alongside the trip request, directly address it in "reply" while summarizing the tailored itinerary.',
        retryFeedback && retryFeedback.length > 0 ? `
FIX THESE PREVIOUS EVALUATOR VIOLATIONS:
- ${retryFeedback.join("\n- ")}` : ""
      ].filter(Boolean).join("\n");
      const payloadContext = {
        userGoal: intake.rawUserGoal || req.message,
        duration: intake.duration,
        travelersCount: capacityPlan.travelersCount,
        companionType: capacityPlan.companionType,
        season: capacityPlan.seasonHeadline,
        stay: capacityPlan.selectedStay ? {
          name: capacityPlan.selectedStay.name,
          area: capacityPlan.selectedStay.area,
          totalStayVnd: budgetResult.reservedStayVnd
        } : null,
        logistics: capacityPlan.selectedLogistics ? {
          label: capacityPlan.selectedLogistics.label,
          totalTransitVnd: budgetResult.reservedTransitVnd
        } : null,
        budgetBreakdown: {
          totalBudgetVnd: budgetResult.totalBudgetVnd,
          reservedStayVnd: budgetResult.reservedStayVnd,
          reservedTransitVnd: budgetResult.reservedTransitVnd,
          reservedFoodVnd: budgetResult.reservedFoodVnd,
          contingencyVnd: budgetResult.contingencyVnd,
          availableActivityBudgetVnd: budgetResult.availableActivityBudgetVnd
        },
        ALLOWED_SELECTED_PLACES: allowedPlacesJson,
        disclaimers: budgetResult.disclaimers
      };
      const userPayloadStr = JSON.stringify(payloadContext);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_CHAT_TIMEOUT_MS);
      try {
        const llmCall = await withOpenInferenceSpan(
          "gemini_phase5_synthesis",
          {
            kind: OpenInferenceSpanKind7.LLM,
            input: userPayloadStr,
            attributes: {
              [LLM_MODEL_NAME3]: model,
              [LLM_PROVIDER3]: "google",
              [LLM_SYSTEM3]: "gemini",
              [`${SemanticConventions5.LLM_INPUT_MESSAGES}.0.${SemanticConventions5.MESSAGE_ROLE}`]: "system",
              [`${SemanticConventions5.LLM_INPUT_MESSAGES}.0.${SemanticConventions5.MESSAGE_CONTENT}`]: systemText,
              [`${SemanticConventions5.LLM_INPUT_MESSAGES}.1.${SemanticConventions5.MESSAGE_ROLE}`]: "user",
              [`${SemanticConventions5.LLM_INPUT_MESSAGES}.1.${SemanticConventions5.MESSAGE_CONTENT}`]: userPayloadStr
            },
            formatOutput: (res) => res.rawText,
            onSuccess: (span, res) => {
              span.setAttribute(
                `${SemanticConventions5.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions5.MESSAGE_ROLE}`,
                "assistant"
              );
              span.setAttribute(
                `${SemanticConventions5.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions5.MESSAGE_CONTENT}`,
                res.rawText
              );
              if (res.usage?.promptTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_PROMPT3, res.usage.promptTokenCount);
              }
              if (res.usage?.candidatesTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_COMPLETION3, res.usage.candidatesTokenCount);
              }
              if (res.usage?.totalTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_TOTAL3, res.usage.totalTokenCount);
              }
            }
          },
          async () => {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: "user", parts: [{ text: userPayloadStr }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: AI_RESPONSE_MAX_TOKENS,
                  responseMimeType: "application/json",
                  responseSchema: PHASE5_RESPONSE_SCHEMA
                }
              })
            });
            if (!response.ok) {
              const errBody = await response.text().catch(() => "");
              throw new Error(`Gemini Phase 5 HTTP ${response.status}: ${errBody.slice(0, 200)}`);
            }
            const data = await response.json();
            const rawText2 = (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            return { rawText: rawText2, usage: data.usageMetadata };
          }
        );
        const { rawText } = llmCall;
        if (!rawText) return deterministic;
        const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(jsonText);
        const rawDays = Array.isArray(parsed.generatedDays) && parsed.generatedDays.length > 0 ? parsed.generatedDays : deterministic.generatedDays;
        const hydratedDays = rawDays.map((day, dIdx) => ({
          day: String(day.day || `Ng\xE0y ${dIdx + 1}`),
          title: String(day.title || deterministic.generatedDays?.[dIdx]?.title || ""),
          area: String(day.area || ""),
          slots: (Array.isArray(day.slots) ? day.slots : []).map((slot) => {
            const dirMatch = dakLakPlaceDirectory.find(
              (p) => p.title.toLowerCase() === String(slot.title || "").trim().toLowerCase()
            );
            const selectedMatch = purposeSelection.selectedPlaces.find(
              (p) => p.title.toLowerCase() === String(slot.title || "").trim().toLowerCase()
            );
            return {
              time: String(slot.time || dirMatch?.time || "08:30 \u2013 10:30"),
              period: String(slot.period || dirMatch?.period || "Bu\u1ED5i s\xE1ng"),
              title: dirMatch?.title || String(slot.title || "").trim(),
              location: dirMatch?.location || String(slot.location || "\u0110\u1EAFk L\u1EAFk"),
              desc: String(slot.desc || dirMatch?.desc || ""),
              isCustom: !dirMatch,
              areaCluster: selectedMatch?.areaCluster || slot.areaCluster,
              x: dirMatch?.x,
              y: dirMatch?.y,
              lat: dirMatch?.lat,
              lng: dirMatch?.lng,
              googleMapsQuery: dirMatch?.googleMapsQuery,
              category: dirMatch?.category,
              duration: dirMatch?.duration,
              estimatedCostVnd: typeof slot.estimatedCostVnd === "number" ? slot.estimatedCostVnd : selectedMatch?.estimatedSpendVnd
            };
          })
        }));
        const generatedExpenses = Array.isArray(parsed.generatedExpenses) && parsed.generatedExpenses.length > 0 ? parsed.generatedExpenses.map((e, idx) => ({
          id: `exp-${idx + 1}`,
          title: String(e.title || "Chi ph\xED chuy\u1EBFn \u0111i"),
          cat: e.cat === "stay" || e.cat === "transit" || e.cat === "food" || e.cat === "activity" ? e.cat : "activity",
          amount: Math.max(0, Math.round(Number(e.amount) || 0)),
          note: typeof e.note === "string" ? e.note : void 0
        })) : deterministic.generatedExpenses;
        const itineraryMeta = {
          title: String(parsed.itineraryMeta?.title || deterministic.itineraryMeta.title),
          stayMove: String(parsed.itineraryMeta?.stayMove || deterministic.itineraryMeta.stayMove),
          routeTip: String(parsed.itineraryMeta?.routeTip || deterministic.itineraryMeta.routeTip),
          tips: Array.isArray(parsed.itineraryMeta?.tips) && parsed.itineraryMeta.tips.length > 0 ? parsed.itineraryMeta.tips.map((t) => String(t)) : deterministic.itineraryMeta.tips,
          hiddenGem: parsed.itineraryMeta?.hiddenGem || deterministic.itineraryMeta.hiddenGem,
          totalEstimatedKm: computeTotalEstimatedKm(hydratedDays)
        };
        return {
          ...deterministic,
          reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : deterministic.reply,
          itineraryMeta,
          generatedDays: hydratedDays,
          generatedExpenses,
          citations: deterministic.citations,
          suggestedTab: parsed.suggestedTab || "map",
          provider: `gemini-ai:${model}`
        };
      } catch {
        return deterministic;
      } finally {
        clearTimeout(timer);
      }
    }
  );
}

// server/services/ai/workflow/langGraphAgent.ts
var LANGGRAPH_TOOL_NAMES = [
  "search_local_daklak_catalog",
  "search_live_web_tavily",
  "update_trip_intake",
  "plan_or_modify_itinerary"
];
var VALID_THEMES2 = ["coffee", "culture", "nature", "cuisine"];
var VALID_DURATIONS2 = ["2N1D", "3N2D", "4N3D+"];
var VALID_COMPANIONS2 = ["solo", "couple", "family", "friends"];
var VALID_BUDGETS2 = ["budget", "standard", "luxury"];
var VALID_INTENTS = ["general_qa", "update_itinerary", "modify_stops"];
function sanitizeTheme(val, fallback) {
  return VALID_THEMES2.includes(val) ? val : fallback;
}
function sanitizeDuration(val, fallback) {
  return VALID_DURATIONS2.includes(val) ? val : fallback;
}
function sanitizeCompanion(val, fallback) {
  return VALID_COMPANIONS2.includes(val) ? val : fallback;
}
function sanitizeBudget(val, fallback) {
  return VALID_BUDGETS2.includes(val) ? val : fallback;
}
function sanitizeIntent(val, fallback) {
  return VALID_INTENTS.includes(val) ? val : fallback;
}
function dedupeCitations(citations) {
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const c of citations) {
    if (!c || !c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    unique.push(c);
  }
  return unique;
}
function detectStopOperationsFallback(message, currentDays) {
  const lower = message.toLowerCase();
  const swapMatch = message.match(
    /(?:đổi|thay\s*thế|thay|swap|replace)\s+(.+?)\s+(?:sang|thành|bằng|qua|với|for|with|to)\s+(.+)/i
  );
  const isRemove = Boolean(swapMatch) || /(bỏ|xóa|bớt|gỡ|remove|drop|delete)/i.test(lower);
  const isAdd = Boolean(swapMatch) || /(thêm|ghé|bổ sung|add|include|visit)/i.test(lower);
  const removeSourceText = swapMatch ? swapMatch[1].toLowerCase() : lower;
  const addTargetText = swapMatch ? swapMatch[2].toLowerCase() : lower;
  const ops = [];
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const dayNumber = dayMatch ? Number(dayMatch[1]) : void 0;
  if (isRemove) {
    for (const day of currentDays) {
      for (const slot of day.slots) {
        const titleLower = slot.title.toLowerCase();
        const keyWords = titleLower.split(/\s+/).filter((w) => w.length >= 3);
        if (removeSourceText.includes(titleLower) || keyWords.filter((w) => removeSourceText.includes(w)).length >= 2) {
          ops.push({ action: "remove", placeTitle: slot.title, dayNumber });
          break;
        }
      }
    }
  }
  if (isAdd || !isRemove) {
    const removedTitles = new Set(
      ops.filter((o) => o.action === "remove").map((o) => o.placeTitle.toLowerCase())
    );
    for (const place of dakLakPlaceDirectory) {
      const titleLower = place.title.toLowerCase();
      if (removedTitles.has(titleLower)) continue;
      const shortMatch = titleLower.includes("dray nur") && addTargetText.includes("dray nur") || titleLower.includes("h\u1ED3 l\u1EAFk") && addTargetText.includes("h\u1ED3 l\u1EAFk") || titleLower.includes("yok \u0111\xF4n") && addTargetText.includes("yok \u0111\xF4n") || titleLower.includes("ako dh\xF4ng") && addTargetText.includes("ako dh\xF4ng") || titleLower.includes("t\u01A1ng j\xFA") && addTargetText.includes("t\u01A1ng j\xFA") || titleLower.includes("ea t\xE2n") && addTargetText.includes("ea t\xE2n") || titleLower.includes("\u0111\xE1 voi") && addTargetText.includes("\u0111\xE1 voi") || titleLower.includes("b\u1EA3o t\xE0ng \u0111\u1EAFk l\u1EAFk") && addTargetText.includes("b\u1EA3o t\xE0ng \u0111\u1EAFk l\u1EAFk") || titleLower.includes("th\u1EBF gi\u1EDBi c\xE0 ph\xEA") && addTargetText.includes("th\u1EBF gi\u1EDBi c\xE0 ph\xEA") || titleLower.includes("trung nguy\xEAn") && addTargetText.includes("trung nguy\xEAn") || titleLower.includes("phan \u0111\xECnh gi\xF3t") && addTargetText.includes("phan \u0111\xECnh gi\xF3t") || titleLower.includes("b\u1EA3n \u0111\xF4n") && addTargetText.includes("b\u1EA3n \u0111\xF4n");
      if (addTargetText.includes(titleLower) || shortMatch) {
        ops.push({
          action: isRemove && !isAdd ? "remove" : "add",
          placeTitle: place.title,
          dayNumber,
          time: place.time,
          period: place.period
        });
      }
    }
  }
  return ops.slice(0, 4);
}
function buildModifyStopsReply(req, ops, preferences, provider) {
  const effectiveOps = ops.length > 0 ? ops : detectStopOperationsFallback(req.message, req.currentState.days);
  const summaryList = effectiveOps.map((op) => `${op.action === "remove" ? "-" : "+"} ${op.placeTitle}`).join(", ");
  const reply = effectiveOps.length > 0 ? req.lang === "en" ? `Updated your itinerary stops (${summaryList}) while keeping your current schedule intact.` : `\u0110\xE3 c\u1EADp nh\u1EADt \u0111i\u1EC3m d\u1EEBng trong l\u1ECBch tr\xECnh (${summaryList}) v\xE0 gi\u1EEF nguy\xEAn c\u1EA5u tr\xFAc c\xE1c ng\xE0y c\xF2n l\u1EA1i.` : req.lang === "en" ? "Could you specify the exact \u0110\u1EAFk L\u1EAFk place name you want to add or remove from your itinerary?" : "B\u1EA1n cho m\xECnh bi\u1EBFt t\xEAn \u0111i\u1EC3m d\u1EEBng c\u1EE5 th\u1EC3 mu\u1ED1n th\xEAm ho\u1EB7c b\u1EDBt trong l\u1ECBch tr\xECnh hi\u1EC7n t\u1EA1i nh\xE9!";
  return {
    intent: "modify_stops",
    reply,
    shouldOpenPlanner: true,
    preferences,
    resetItineraryToTheme: false,
    stopOperations: effectiveOps,
    suggestedTab: "schedule",
    status: "completed",
    provider
  };
}
var DakLakGraphStateAnnotation = Annotation.Root({
  req: Annotation({
    reducer: (_left, right) => right
  }),
  sessionId: Annotation({
    reducer: (_left, right) => right,
    default: () => "default_session"
  }),
  traceId: Annotation({
    reducer: (_left, right) => right,
    default: () => ""
  }),
  messages: Annotation({
    reducer: (left, right) => (Array.isArray(left) ? left : []).concat(Array.isArray(right) ? right : [right]),
    default: () => []
  }),
  intent: Annotation({
    reducer: (_left, right) => right,
    default: () => "general_qa"
  }),
  followUpAction: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  plannedTools: Annotation({
    reducer: (_left, right) => right,
    default: () => []
  }),
  intake: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  phase1Output: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  clarificationOptions: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  localContext: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  tavilyContext: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  plannerResults: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  response: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  toolsUsed: Annotation({
    reducer: (_left, right) => right,
    default: () => []
  }),
  graphNodesVisited: Annotation({
    reducer: (_left, right) => right,
    default: () => []
  }),
  evalAttempts: Annotation({
    reducer: (_left, right) => right,
    default: () => 0
  }),
  evalResult: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  needsEvalRetry: Annotation({
    reducer: (_left, right) => right,
    default: () => false
  }),
  retryFeedback: Annotation({
    reducer: (_left, right) => right,
    default: () => []
  })
});
var sharedCheckpointer = new MemorySaver();
var traceMetadataStore = /* @__PURE__ */ new Map();
function getLangGraphTraceMetadata(traceId) {
  return traceMetadataStore.get(traceId);
}
function createDakLakLangGraphTools(context2) {
  const defaultReq = context2?.req || {
    message: "",
    lang: "vi",
    isFollowUp: false,
    currentState: {
      theme: "coffee",
      duration: "3N2D",
      companion: "couple",
      budget: "standard",
      days: []
    }
  };
  const opts = context2?.options;
  const searchLocalDakLakCatalogTool = tool(
    async (input) => {
      return withOpenInferenceSpan(
        "search_local_daklak_catalog",
        {
          kind: OpenInferenceSpanKind8.TOOL,
          input,
          attributes: {
            [TOOL_NAME2]: "search_local_daklak_catalog",
            [TOOL_DESCRIPTION2]: "Queries local SQLite stays, logistics, enriched places directory, seasons, and published CMS posts.",
            [TOOL_PARAMETERS2]: JSON.stringify(input)
          },
          formatOutput: (out) => ({
            staysCount: out.stays.length,
            logisticsCount: out.logistics.length,
            placesCount: out.places.length,
            seasonsCount: out.seasons.length,
            postsCount: out.relevantPosts.length
          })
        },
        async () => {
          const grounded = await loadGroundedQaContext({
            stays: opts?.stays,
            logistics: opts?.logistics
          });
          const lang = input.lang || defaultReq.lang || "vi";
          const themeKey = input.themeKey || defaultReq.currentState.theme || "coffee";
          let relevantPosts = [];
          try {
            relevantPosts = await queryRelevantPublishedPosts({
              lang,
              themeKey,
              limit: 3
            });
          } catch {
            relevantPosts = [];
          }
          const citations = relevantPosts.map((p) => ({
            title: p.title,
            url: `/blog/${p.slug}`,
            snippet: p.excerpt,
            source: "cms"
          }));
          return {
            ...grounded,
            relevantPosts,
            citations
          };
        }
      );
    },
    {
      name: "search_local_daklak_catalog",
      description: "Queries local \u0110\u1EAFk L\u1EAFk SQLite catalog for stays/accommodations & amenities, transport/logistics rates, curated attraction directory, seasonal guides, and published CMS stories.",
      schema: z.object({
        query: z.string().describe("User question or search topic for local \u0110\u1EAFk L\u1EAFk catalog"),
        lang: z.enum(["vi", "en"]).optional().describe("UI language (vi or en)"),
        themeKey: z.enum(["coffee", "culture", "nature", "cuisine"]).optional().describe("Primary travel theme for relevant CMS stories")
      })
    }
  );
  const searchLiveWebTavilyTool = tool(
    async (input) => {
      return withOpenInferenceSpan(
        "search_live_web_tavily",
        {
          kind: OpenInferenceSpanKind8.TOOL,
          input,
          attributes: {
            [TOOL_NAME2]: "search_live_web_tavily",
            [TOOL_DESCRIPTION2]: "Searches live external web via Tavily for up-to-date prices, opening hours, weather, festivals, transport, or external \u0110\u1EAFk L\u1EAFk landmarks.",
            [TOOL_PARAMETERS2]: JSON.stringify(input)
          },
          formatOutput: (out) => ({
            query: out.query,
            status: out.status || "ok",
            ...out.error ? { error: out.error } : {},
            hasAnswer: Boolean(out.answer),
            snippetsCount: out.snippets.length,
            citationsCount: out.citations.length
          })
        },
        async () => {
          if (opts?.forceSkipTavily || opts?.enableTavily === false) {
            return {
              query: input.query,
              snippets: [],
              citations: [],
              status: "disabled"
            };
          }
          return searchGeneralQaWithTavily(input.query, {
            enableTavily: opts?.enableTavily,
            tavilyClient: opts?.tavilyClient
          });
        }
      );
    },
    {
      name: "search_live_web_tavily",
      description: "Invokes Tavily live web search for external information, real-time attraction/hotel prices, weather, events, flights/buses, or unseeded \u0110\u1EAFk L\u1EAFk landmarks, returning grounded citations.",
      schema: z.object({
        query: z.string().describe("Live web search query for \u0110\u1EAFk L\u1EAFk / Bu\xF4n Ma Thu\u1ED9t")
      })
    }
  );
  const updateTripIntakeTool = tool(
    async (input) => {
      return withOpenInferenceSpan(
        "update_trip_intake",
        {
          kind: OpenInferenceSpanKind8.TOOL,
          input,
          attributes: {
            [TOOL_NAME2]: "update_trip_intake",
            [TOOL_DESCRIPTION2]: "Extracts and merges user trip constraints into IntakeState and builds clarification options.",
            [TOOL_PARAMETERS2]: JSON.stringify(input)
          },
          formatOutput: (out) => ({
            intent: out.intake.intent,
            needsClarification: out.intake.needsClarification,
            missingFields: out.intake.missingFields,
            provider: out.provider
          })
        },
        async () => {
          const effectiveReq = {
            ...defaultReq,
            message: input.message ?? defaultReq.message,
            lang: input.lang ?? defaultReq.lang,
            isFollowUp: input.isFollowUp ?? defaultReq.isFollowUp
          };
          const phase1 = await runPhase1Intake(effectiveReq, {
            enableTavily: opts?.forceSkipTavily ? false : opts?.enableTavily,
            tavilyClient: opts?.tavilyClient
          });
          const clarificationOptions = phase1.intake.needsClarification ? buildClarificationOptions(effectiveReq.lang, phase1.intake.missingFields) : [];
          return {
            intake: phase1.intake,
            stopOperations: phase1.stopOperations,
            clarificationOptions,
            generalQaReply: phase1.generalQaReply,
            citations: phase1.citations,
            tavilySnippets: phase1.tavilySnippets,
            tavilyAnswer: phase1.tavilyAnswer,
            provider: phase1.provider
          };
        }
      );
    },
    {
      name: "update_trip_intake",
      description: "Extracts and merges traveler count, companion type, dates/duration, budget tier/amount, and purpose into IntakeState with non-blocking Q&A support.",
      schema: z.object({
        message: z.string().optional().describe("User message to extract trip slots from"),
        lang: z.enum(["vi", "en"]).optional().describe("UI language"),
        isFollowUp: z.boolean().optional().describe("Whether this is a follow-up turn")
      })
    }
  );
  const planOrModifyItineraryTool = tool(
    async (input) => {
      return withOpenInferenceSpan(
        "plan_or_modify_itinerary",
        {
          kind: OpenInferenceSpanKind8.TOOL,
          input,
          attributes: {
            [TOOL_NAME2]: "plan_or_modify_itinerary",
            [TOOL_DESCRIPTION2]: "Executes Phases 2-5 itinerary synthesis or targeted follow-up mutations via followUpRouter.",
            [TOOL_PARAMETERS2]: JSON.stringify(input)
          },
          formatOutput: (out) => ({
            mode: out.mode,
            followUpAction: out.followUpAction,
            handled: out.handled,
            daysCount: out.response?.generatedDays?.length || 0
          })
        },
        async () => {
          const effectiveReq = {
            ...defaultReq,
            message: input.message ?? defaultReq.message
          };
          const requestedMode = input.mode || "full_plan";
          if (requestedMode === "follow_up") {
            const followUpResult = await routeFollowUp(effectiveReq, {
              fetchFn: opts?.fetchFn,
              stays: opts?.stays,
              logistics: opts?.logistics
            });
            if (followUpResult.handled && followUpResult.response) {
              return {
                mode: "follow_up",
                followUpAction: followUpResult.followUpAction,
                handled: true,
                response: followUpResult.response
              };
            }
          }
          const effectiveIntake = context2?.intake || runPhase1IntakeDeterministic(effectiveReq).intake;
          const resolvedPreferences = {
            theme: sanitizeTheme(effectiveIntake.mainPurpose, effectiveReq.currentState.theme),
            duration: sanitizeDuration(effectiveIntake.duration, effectiveReq.currentState.duration),
            companion: sanitizeCompanion(
              effectiveIntake.companionType,
              effectiveReq.currentState.companion
            ),
            budget: sanitizeBudget(effectiveIntake.budgetTier, effectiveReq.currentState.budget)
          };
          if (requestedMode === "modify_stops" || effectiveIntake.intent === "modify_stops") {
            const hasGemini2 = Boolean(GEMINI_API_KEY.trim());
            const modRes = buildModifyStopsReply(
              effectiveReq,
              [],
              resolvedPreferences,
              hasGemini2 ? `gemini-ai:${GEMINI_MODEL.trim() || "gemini-2.5-flash"}` : "local-fallback"
            );
            return {
              mode: "modify_stops",
              followUpAction: "modify_stops",
              handled: true,
              response: modRes
            };
          }
          const capacityPlan = await runPhase2Capacity(effectiveIntake, {
            stays: opts?.stays,
            logistics: opts?.logistics,
            lang: effectiveReq.lang
          });
          const budgetResult = await runPhase3Budget(effectiveIntake, capacityPlan, {
            forceSkipTavily: opts?.forceSkipTavily,
            skipSqliteUpsert: opts?.skipSqliteUpsert,
            tavilyLookupFn: opts?.tavilyLookupFn,
            lang: effectiveReq.lang
          });
          const purposeSelection = await runPhase4Purpose(
            effectiveIntake,
            capacityPlan,
            budgetResult,
            {
              lang: effectiveReq.lang,
              pinnedPlaces: effectiveReq.backpackItems?.map((b) => b.title).filter(Boolean),
              fetchFn: opts?.fetchFn
            }
          );
          const hasGemini = Boolean(GEMINI_API_KEY.trim());
          const synthesized = hasGemini ? await runPhase5Synthesis(
            effectiveReq,
            effectiveIntake,
            capacityPlan,
            budgetResult,
            purposeSelection
          ) : synthesizeDeterministicPlan(
            effectiveReq,
            effectiveIntake,
            capacityPlan,
            budgetResult,
            purposeSelection,
            "local-fallback"
          );
          return {
            mode: "full_plan",
            handled: true,
            capacityPlan,
            budgetResult,
            purposeSelection,
            response: synthesized
          };
        }
      );
    },
    {
      name: "plan_or_modify_itinerary",
      description: "Executes full 5-phase \u0110\u1EAFk L\u1EAFk itinerary synthesis (capacity, budget feasibility, purpose selection, schedule & expense synthesis) or targeted follow-up itinerary edits.",
      schema: z.object({
        mode: z.enum(["full_plan", "follow_up", "modify_stops"]).optional().describe("Execution mode: full_plan, follow_up, or modify_stops"),
        message: z.string().optional().describe("User request message")
      })
    }
  );
  return {
    search_local_daklak_catalog: searchLocalDakLakCatalogTool,
    search_live_web_tavily: searchLiveWebTavilyTool,
    update_trip_intake: updateTripIntakeTool,
    plan_or_modify_itinerary: planOrModifyItineraryTool,
    all: [
      searchLocalDakLakCatalogTool,
      searchLiveWebTavilyTool,
      updateTripIntakeTool,
      planOrModifyItineraryTool
    ]
  };
}
function buildDakLakLangGraph(options) {
  const supervisorRouterNode = async (state) => {
    const visited = [...state.graphNodesVisited || [], "supervisor_router"];
    const baseReq = state.req;
    const checkpointDraftIntake = !baseReq.draftIntake && state.intake?.needsClarification ? state.intake : baseReq.draftIntake;
    const req = checkpointDraftIntake ? { ...baseReq, draftIntake: checkpointDraftIntake } : baseReq;
    const plannedTools = [];
    let followUpAction;
    let intent = "general_qa";
    const isActiveFollowUp = req.isFollowUp && req.currentState.days.length > 0 && !req.draftIntake?.needsClarification;
    const apiKey = GEMINI_API_KEY.trim();
    const modelName = GEMINI_MODEL.trim() || "gemini-2.5-flash";
    let aiSupervisorMessage = null;
    if (apiKey) {
      try {
        const tools = createDakLakLangGraphTools({ req, options }).all;
        const llm = new ChatGoogleGenerativeAI({
          apiKey,
          model: modelName,
          temperature: 0.1,
          maxOutputTokens: 256
        }).bindTools(tools);
        const sysMsg = new SystemMessage(
          [
            "You are the LangGraph Supervisor Router for \u0110\u1EAFk L\u1EAFk AI Travel Concierge.",
            "Select the appropriate tools to handle the user message:",
            "- For general questions, stay/amenity inquiries, transport/price/weather/festival/external landmark questions: call `search_local_daklak_catalog` and `search_live_web_tavily`.",
            "- For new trip planning or slot clarification replies: call `update_trip_intake` (and `plan_or_modify_itinerary` when slots are complete).",
            "- For follow-up edits on an active itinerary: call `plan_or_modify_itinerary`."
          ].join("\n")
        );
        aiSupervisorMessage = await withOpenInferenceSpan(
          "langgraph_supervisor_llm",
          {
            kind: OpenInferenceSpanKind8.LLM,
            input: req.message,
            attributes: {
              [LLM_MODEL_NAME4]: modelName,
              [LLM_PROVIDER4]: "google",
              [LLM_SYSTEM4]: "gemini"
            },
            formatOutput: (msg) => ({
              content: typeof msg.content === "string" ? msg.content : "",
              toolCalls: (msg.tool_calls || []).map((tc) => tc.name)
            })
          },
          async () => {
            const timeoutPromise = new Promise(
              (resolve) => setTimeout(() => resolve(null), 3500)
            );
            const res = await Promise.race([
              llm.invoke([sysMsg, new HumanMessage(req.message)]),
              timeoutPromise
            ]);
            return res ? res : new AIMessage("");
          }
        );
      } catch {
        aiSupervisorMessage = null;
      }
    }
    if (isActiveFollowUp) {
      const classified = await classifyFollowUpAction(req, {
        fetchFn: options?.fetchFn,
        stays: options?.stays,
        logistics: options?.logistics
      });
      followUpAction = classified.action;
      if (followUpAction === "current_trip_qa") {
        intent = "general_qa";
        plannedTools.push("search_local_daklak_catalog", "search_live_web_tavily");
      } else if (followUpAction === "full_replan") {
        intent = "plan_trip";
        plannedTools.push("update_trip_intake", "plan_or_modify_itinerary");
      } else {
        intent = followUpAction === "modify_stops" ? "modify_stops" : "plan_trip";
        plannedTools.push("plan_or_modify_itinerary");
      }
    } else {
      const detPhase1 = runPhase1IntakeDeterministic(req);
      intent = detPhase1.intake.intent;
      if (intent === "general_qa") {
        plannedTools.push("update_trip_intake", "search_local_daklak_catalog", "search_live_web_tavily");
      } else if (intent === "modify_stops") {
        plannedTools.push("update_trip_intake", "plan_or_modify_itinerary");
      } else {
        plannedTools.push("update_trip_intake");
        if (!detPhase1.intake.needsClarification) {
          plannedTools.push("plan_or_modify_itinerary");
        }
      }
    }
    if (aiSupervisorMessage?.tool_calls && aiSupervisorMessage.tool_calls.length > 0) {
      for (const tc of aiSupervisorMessage.tool_calls) {
        const toolName = tc.name;
        if (LANGGRAPH_TOOL_NAMES.includes(toolName) && !plannedTools.includes(toolName)) {
          if (intent === "general_qa" && toolName === "plan_or_modify_itinerary") {
            continue;
          }
          plannedTools.push(toolName);
        }
      }
    }
    const newMessages = [new HumanMessage(req.message)];
    if (aiSupervisorMessage) {
      newMessages.push(aiSupervisorMessage);
    }
    return {
      req,
      intent,
      followUpAction,
      plannedTools,
      graphNodesVisited: visited,
      messages: newMessages
    };
  };
  const toolExecutionNode = async (state) => {
    const visited = [...state.graphNodesVisited || [], "tool_execution_node"];
    const req = state.req;
    let currentIntake = state.intake;
    let phase1Output = state.phase1Output;
    let clarificationOptions = state.clarificationOptions;
    let localContext = state.localContext;
    let tavilyContext = state.tavilyContext;
    let plannerResults = state.plannerResults;
    let intent = state.intent;
    let followUpAction = state.followUpAction;
    const toolsUsed = [...state.toolsUsed || []];
    const toolMessages = [];
    const planned = [...state.plannedTools || []];
    const recordToolUse = (name, summaryObj) => {
      if (!toolsUsed.includes(name)) {
        toolsUsed.push(name);
      }
      toolMessages.push(
        new ToolMessage({
          tool_call_id: `call_${name}_${toolsUsed.length}`,
          name,
          content: JSON.stringify(summaryObj)
        })
      );
    };
    if (planned.includes("update_trip_intake")) {
      const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
      const intakeOut = await toolset.update_trip_intake.invoke({
        message: req.message,
        lang: req.lang,
        isFollowUp: req.isFollowUp
      });
      currentIntake = intakeOut.intake;
      phase1Output = {
        intake: intakeOut.intake,
        stopOperations: intakeOut.stopOperations,
        generalQaReply: intakeOut.generalQaReply,
        citations: intakeOut.citations,
        tavilySnippets: intakeOut.tavilySnippets,
        tavilyAnswer: intakeOut.tavilyAnswer,
        provider: intakeOut.provider
      };
      clarificationOptions = intakeOut.clarificationOptions;
      intent = intakeOut.intake.intent;
      recordToolUse("update_trip_intake", {
        intent: currentIntake.intent,
        needsClarification: currentIntake.needsClarification,
        missingFields: currentIntake.missingFields
      });
      if (intent === "general_qa") {
        if (!planned.includes("search_local_daklak_catalog")) {
          planned.push("search_local_daklak_catalog");
        }
        if (!planned.includes("search_live_web_tavily")) {
          planned.push("search_live_web_tavily");
        }
      } else if (intent === "plan_trip" && !currentIntake.needsClarification) {
        if (!planned.includes("plan_or_modify_itinerary")) {
          planned.push("plan_or_modify_itinerary");
        }
      } else if (intent === "modify_stops" && !planned.includes("plan_or_modify_itinerary")) {
        planned.push("plan_or_modify_itinerary");
      }
    }
    if (planned.includes("search_local_daklak_catalog")) {
      const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
      const themeKey = sanitizeTheme(
        currentIntake?.mainPurpose || req.currentState.theme,
        req.currentState.theme
      );
      localContext = await toolset.search_local_daklak_catalog.invoke({
        query: req.message,
        lang: req.lang,
        themeKey
      });
      recordToolUse("search_local_daklak_catalog", {
        staysCount: localContext.stays.length,
        placesCount: localContext.places.length,
        postsCount: localContext.relevantPosts.length
      });
    }
    if (planned.includes("search_live_web_tavily")) {
      if (phase1Output && (phase1Output.tavilySnippets && phase1Output.tavilySnippets.length > 0 || phase1Output.tavilyAnswer)) {
        tavilyContext = {
          query: req.message,
          ...phase1Output.tavilyAnswer ? { answer: phase1Output.tavilyAnswer } : {},
          snippets: phase1Output.tavilySnippets || [],
          citations: phase1Output.citations || []
        };
      } else {
        const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
        tavilyContext = await toolset.search_live_web_tavily.invoke({
          query: req.message
        });
      }
      recordToolUse("search_live_web_tavily", {
        status: tavilyContext.status || "ok",
        ...tavilyContext.error ? { error: tavilyContext.error } : {},
        hasAnswer: Boolean(tavilyContext.answer),
        snippetsCount: tavilyContext.snippets.length,
        citationsCount: tavilyContext.citations.length
      });
    }
    const shouldRunPlanner = planned.includes("plan_or_modify_itinerary") && intent !== "general_qa" && !(intent === "plan_trip" && currentIntake?.needsClarification);
    if (shouldRunPlanner) {
      const isFollowUpEdit = req.isFollowUp && req.currentState.days.length > 0 && !req.draftIntake?.needsClarification && followUpAction !== void 0 && followUpAction !== "full_replan" && followUpAction !== "current_trip_qa";
      const mode = isFollowUpEdit ? "follow_up" : intent === "modify_stops" ? "modify_stops" : "full_plan";
      if (mode === "modify_stops" && phase1Output && phase1Output.stopOperations.length > 0) {
        const resolvedPreferences = {
          theme: sanitizeTheme(currentIntake?.mainPurpose, req.currentState.theme),
          duration: sanitizeDuration(currentIntake?.duration, req.currentState.duration),
          companion: sanitizeCompanion(currentIntake?.companionType, req.currentState.companion),
          budget: sanitizeBudget(currentIntake?.budgetTier, req.currentState.budget)
        };
        const hasGemini = Boolean(GEMINI_API_KEY.trim());
        plannerResults = {
          mode: "modify_stops",
          followUpAction: "modify_stops",
          handled: true,
          response: buildModifyStopsReply(
            req,
            phase1Output.stopOperations,
            resolvedPreferences,
            hasGemini ? phase1Output.provider : "local-fallback"
          )
        };
      } else {
        const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
        plannerResults = await toolset.plan_or_modify_itinerary.invoke({
          mode,
          message: req.message
        });
      }
      if (plannerResults.followUpAction) {
        followUpAction = plannerResults.followUpAction;
      }
      recordToolUse("plan_or_modify_itinerary", {
        mode: plannerResults.mode,
        followUpAction: plannerResults.followUpAction,
        daysCount: plannerResults.response?.generatedDays?.length || 0
      });
    }
    return {
      intent,
      followUpAction,
      intake: currentIntake,
      phase1Output,
      clarificationOptions,
      localContext,
      tavilyContext,
      plannerResults,
      toolsUsed,
      graphNodesVisited: visited,
      messages: toolMessages
    };
  };
  const synthesisNode = async (state) => {
    const visited = [...state.graphNodesVisited || [], "synthesis_node"];
    const req = state.req;
    const intake = state.intake;
    const phase1Output = state.phase1Output;
    const localContext = state.localContext;
    const tavilyContext = state.tavilyContext;
    let plannerResults = state.plannerResults;
    const hasGemini = Boolean(getGeminiApiKey() || GEMINI_API_KEY.trim());
    const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
    const resolvedPreferences = {
      theme: sanitizeTheme(intake?.mainPurpose, req.currentState.theme),
      duration: sanitizeDuration(intake?.duration, req.currentState.duration),
      companion: sanitizeCompanion(intake?.companionType, req.currentState.companion),
      budget: sanitizeBudget(intake?.budgetTier, req.currentState.budget)
    };
    let response;
    if (state.evalAttempts > 0 && state.retryFeedback.length > 0 && plannerResults?.mode === "full_plan" && plannerResults.capacityPlan && plannerResults.budgetResult && plannerResults.purposeSelection && intake && hasGemini) {
      const retriedResponse = await runPhase5Synthesis(
        req,
        intake,
        plannerResults.capacityPlan,
        plannerResults.budgetResult,
        plannerResults.purposeSelection,
        state.retryFeedback
      );
      plannerResults = {
        ...plannerResults,
        response: retriedResponse
      };
      response = retriedResponse;
    } else if (plannerResults?.handled && plannerResults.response) {
      response = {
        ...plannerResults.response,
        ...state.followUpAction ? { followUpAction: state.followUpAction } : {}
      };
    } else if (state.intent === "general_qa") {
      const effectiveLang = resolveEffectiveQaLanguage(req.message, req.lang);
      const effectiveSnippets = tavilyContext?.snippets || phase1Output?.tavilySnippets || [];
      const effectiveAnswer = tavilyContext?.answer || phase1Output?.tavilyAnswer;
      const effectiveTavilyCitations = tavilyContext?.citations || phase1Output?.citations || [];
      const cmsCitations = localContext?.citations || [];
      const deterministicReply = await buildGroundedQaReplyDeterministic(req, {
        stays: options?.stays,
        logistics: options?.logistics,
        tavilySnippets: effectiveSnippets,
        ...effectiveAnswer ? { tavilyAnswer: effectiveAnswer } : {}
      });
      const needsGeminiQaSynthesis = hasGemini && (!phase1Output?.generalQaReply || hasElephantRidingViolation(phase1Output.generalQaReply) || (phase1Output.citations || []).length === 0 && (Boolean(effectiveAnswer) || effectiveSnippets.length > 0) || effectiveLang === "vi" && isLikelyEnglishText(phase1Output.generalQaReply));
      let rawReply = hasGemini && phase1Output?.generalQaReply && !hasElephantRidingViolation(phase1Output.generalQaReply) ? phase1Output.generalQaReply : deterministicReply;
      let provider = hasGemini && phase1Output?.generalQaReply ? phase1Output.provider : "local-fallback";
      if (needsGeminiQaSynthesis) {
        const apiKey = getGeminiApiKey() || GEMINI_API_KEY.trim();
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const sysPrompt = [
          "You are the \u0110\u1EAFk L\u1EAFk AI Travel Concierge Q&A Synthesizer.",
          `Target reply language: "${effectiveLang}".`,
          `CRITICAL LANGUAGE RULE: Write 100% of your reply in ${effectiveLang === "vi" ? "natural, fluent Vietnamese" : "natural, fluent English"}. Even if the Tavily web summary or snippets are in English, translate and synthesize every fact into natural ${effectiveLang === "vi" ? "Vietnamese" : "English"} \u2014 NEVER output English sentences when target language is "vi".`,
          "FORMATTING RULE: Format your answer for clear readability using clean Markdown:",
          "- Start with a 1\u20132 sentence direct answer to the user\u2019s question.",
          '- Use concise bullet points ("- **Label**: detail") for schedules, prices, highlights, or practical tips, with blank lines between sections.',
          "- Never suggest elephant riding; promote ethical elephant observation instead."
        ].join("\n");
        const qaPrompt = [
          `userQuestion: ${req.message}`,
          phase1Output?.generalQaReply ? `draftReply:
${phase1Output.generalQaReply}` : "",
          localContext ? `localCatalogSummary:
${JSON.stringify({
            stays: localContext.stays.slice(0, 6).map((s) => ({
              name: s.name,
              area: s.area,
              tier: s.tier,
              nightlyRateVnd: s.nightlyRateVnd,
              amenities: s.amenities
            })),
            places: localContext.places.slice(0, 8).map((p) => ({
              title: p.title,
              location: p.location,
              ticketVnd: p.ticketVnd,
              desc: p.desc
            }))
          })}` : "",
          effectiveAnswer ? `tavilyLiveWebAnswer:
${effectiveAnswer}` : "",
          effectiveSnippets.length > 0 ? `tavilyLiveWebSnippets:
${JSON.stringify(effectiveSnippets)}` : ""
        ].filter(Boolean).join("\n\n");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9e3);
        try {
          const fetchFn = options?.fetchFn || fetch;
          const synthOut = await withOpenInferenceSpan(
            "gemini_langgraph_qa_synthesis",
            {
              kind: OpenInferenceSpanKind8.LLM,
              input: qaPrompt,
              attributes: {
                [LLM_MODEL_NAME4]: model,
                [LLM_PROVIDER4]: "google",
                [LLM_SYSTEM4]: "gemini"
              },
              formatOutput: (text) => text
            },
            async () => {
              const resp = await fetchFn(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: sysPrompt }] },
                  contents: [{ role: "user", parts: [{ text: qaPrompt }] }],
                  generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 1200
                  }
                })
              });
              if (!resp.ok) {
                throw new Error(`Gemini Q&A synthesis HTTP ${resp.status}`);
              }
              const data = await resp.json();
              return (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            }
          );
          if (synthOut && !hasElephantRidingViolation(synthOut) && !(effectiveLang === "vi" && isLikelyEnglishText(synthOut))) {
            rawReply = synthOut;
            provider = `gemini-ai:${model}`;
          }
        } catch {
        } finally {
          clearTimeout(timer);
        }
      }
      if (effectiveLang === "vi" && isLikelyEnglishText(rawReply)) {
        rawReply = deterministicReply;
      }
      const citations = dedupeCitations([...effectiveTavilyCitations, ...cmsCitations]);
      response = {
        intent: "general_qa",
        ...state.followUpAction ? { followUpAction: state.followUpAction } : {},
        reply: rawReply,
        shouldOpenPlanner: false,
        preferences: resolvedPreferences,
        resetItineraryToTheme: false,
        stopOperations: [],
        provider,
        status: "completed",
        citations,
        ...req.draftIntake ? {
          draftIntake: req.draftIntake,
          ...req.draftIntake.missingFields?.length ? {
            clarificationOptions: buildClarificationOptions(
              req.lang,
              req.draftIntake.missingFields
            )
          } : {}
        } : {}
      };
    } else if (intake?.needsClarification) {
      response = {
        intent: "update_itinerary",
        reply: intake.clarificationQuestion || (req.lang === "en" ? "Please share your traveler count, travel dates, and budget tier so I can build an accurate \u0110\u1EAFk L\u1EAFk plan." : "B\u1EA1n cho m\xECnh bi\u1EBFt th\xEAm s\u1ED1 l\u01B0\u1EE3ng ng\u01B0\u1EDDi \u0111i, th\u1EDDi gian d\u1EF1 ki\u1EBFn v\xE0 m\u1EE9c ng\xE2n s\xE1ch \u0111\u1EC3 m\xECnh l\xEAn l\u1ECBch tr\xECnh \u0110\u1EAFk L\u1EAFk ch\xEDnh x\xE1c nh\xE9!"),
        shouldOpenPlanner: false,
        preferences: resolvedPreferences,
        resetItineraryToTheme: false,
        stopOperations: [],
        provider: hasGemini && phase1Output ? phase1Output.provider : "local-fallback",
        status: "needs_clarification",
        suggestedPresets: sampleSchedulePresets,
        draftIntake: intake,
        clarificationOptions: state.clarificationOptions || buildClarificationOptions(req.lang, intake.missingFields)
      };
    } else {
      response = buildModifyStopsReply(
        req,
        phase1Output?.stopOperations || [],
        resolvedPreferences,
        hasGemini && phase1Output ? phase1Output.provider : "local-fallback"
      );
    }
    const enrichedResponse = {
      ...response,
      traceId: state.traceId || response.traceId,
      engine: "langgraph",
      toolsUsed: state.toolsUsed,
      graphNodesVisited: [...visited, "evaluator_guardrail_node"]
    };
    return {
      plannerResults,
      response: enrichedResponse,
      graphNodesVisited: visited,
      messages: [new AIMessage(enrichedResponse.reply)]
    };
  };
  const evaluatorGuardrailNode = async (state) => {
    const visited = [...state.graphNodesVisited || [], "evaluator_guardrail_node"];
    const attempts = (state.evalAttempts || 0) + 1;
    const currentResponse = state.response;
    if (!currentResponse) {
      return {
        graphNodesVisited: visited,
        evalAttempts: attempts,
        needsEvalRetry: false
      };
    }
    const plannerResults = state.plannerResults;
    const intake = state.intake;
    if (plannerResults?.mode === "full_plan" && plannerResults.capacityPlan && plannerResults.budgetResult && plannerResults.purposeSelection && intake) {
      const spanName = attempts > 1 ? "phase5_runtime_evaluator_retry" : "phase5_runtime_evaluator";
      const evalName = attempts > 1 ? "phase5_hard_constraints_retry" : "phase5_hard_constraints";
      const evalCheck = await withOpenInferenceSpan(
        spanName,
        {
          kind: OpenInferenceSpanKind8.EVALUATOR,
          input: {
            attempt: attempts,
            daysCount: currentResponse.generatedDays?.length || 0,
            expensesCount: currentResponse.generatedExpenses?.length || 0,
            totalBudgetVnd: plannerResults.budgetResult.totalBudgetVnd
          },
          formatOutput: (res) => res.evalResult,
          onSuccess: (span, res) => {
            span.setAttribute(EVALUATION_NAME, evalName);
            span.setAttribute(EVALUATION_ANNOTATOR_KIND, "CODE");
            span.setAttribute(EVALUATION_SCORE, res.evalResult.score);
            span.setAttribute(EVALUATION_LABEL, res.evalResult.passed ? "pass" : "fail");
            span.setAttribute(
              EVALUATION_EXPLANATION,
              res.evalResult.violations.join("; ") || "All deterministic checks passed."
            );
          }
        },
        () => evaluatePhase5Output({
          response: currentResponse,
          intake,
          capacityPlan: plannerResults.capacityPlan,
          budgetResult: plannerResults.budgetResult,
          purposeSelection: plannerResults.purposeSelection
        })
      );
      const hasGemini = Boolean(GEMINI_API_KEY.trim());
      const shouldRetry = !evalCheck.evalResult.passed && evalCheck.needsRetry && attempts < 2 && hasGemini;
      const repaired = {
        ...evalCheck.repairedResponse,
        intent: sanitizeIntent(evalCheck.repairedResponse.intent, "update_itinerary"),
        traceId: state.traceId || currentResponse.traceId,
        status: currentResponse.status || "completed",
        ...state.followUpAction ? { followUpAction: state.followUpAction } : {},
        engine: "langgraph",
        toolsUsed: state.toolsUsed,
        graphNodesVisited: visited
      };
      return {
        response: repaired,
        evalResult: evalCheck.evalResult,
        evalAttempts: attempts,
        needsEvalRetry: shouldRetry,
        retryFeedback: evalCheck.evalResult.violations,
        graphNodesVisited: visited
      };
    }
    if (currentResponse.intent === "general_qa") {
      const validPostSlugs = (state.localContext?.relevantPosts || []).map((p) => p.slug);
      const qaEval = await withOpenInferenceSpan(
        "qa_runtime_evaluator",
        {
          kind: OpenInferenceSpanKind8.EVALUATOR,
          input: {
            userMessage: state.req.message,
            replyLength: currentResponse.reply.length,
            citationsCount: currentResponse.citations?.length || 0
          },
          formatOutput: (res) => res.evalResult,
          onSuccess: (span, res) => {
            span.setAttribute(EVALUATION_NAME, "qa_grounding_and_ethics");
            span.setAttribute(EVALUATION_ANNOTATOR_KIND, "CODE");
            span.setAttribute(EVALUATION_SCORE, res.evalResult.score);
            span.setAttribute(EVALUATION_LABEL, res.evalResult.passed ? "pass" : "fail");
            span.setAttribute(
              EVALUATION_EXPLANATION,
              res.evalResult.violations.join("; ") || "All Q&A checks passed."
            );
          }
        },
        () => evaluateQaOutput({
          response: currentResponse,
          userMessage: state.req.message,
          tavilySnippets: state.tavilyContext?.snippets,
          tavilyCitations: state.tavilyContext?.citations,
          validPostSlugs
        })
      );
      const repaired = {
        ...qaEval.repairedResponse,
        traceId: state.traceId || currentResponse.traceId,
        engine: "langgraph",
        toolsUsed: state.toolsUsed,
        graphNodesVisited: visited
      };
      return {
        response: repaired,
        evalResult: qaEval.evalResult,
        evalAttempts: attempts,
        needsEvalRetry: false,
        graphNodesVisited: visited
      };
    }
    let safeReply = currentResponse.reply;
    if (hasElephantRidingViolation(safeReply)) {
      const qaEval = evaluateQaOutput({
        response: currentResponse,
        userMessage: state.req.message
      });
      safeReply = qaEval.repairedResponse.reply;
    }
    return {
      response: {
        ...currentResponse,
        reply: safeReply,
        traceId: state.traceId || currentResponse.traceId,
        engine: "langgraph",
        toolsUsed: state.toolsUsed,
        graphNodesVisited: visited
      },
      evalAttempts: attempts,
      needsEvalRetry: false,
      graphNodesVisited: visited
    };
  };
  const shouldRetryOrFinish = (state) => {
    if (state.needsEvalRetry && state.evalAttempts < 2) {
      return "synthesis_node";
    }
    return END;
  };
  const workflow = new StateGraph(DakLakGraphStateAnnotation).addNode("supervisor_router", supervisorRouterNode).addNode("tool_execution_node", toolExecutionNode).addNode("synthesis_node", synthesisNode).addNode("evaluator_guardrail_node", evaluatorGuardrailNode).addEdge(START, "supervisor_router").addEdge("supervisor_router", "tool_execution_node").addEdge("tool_execution_node", "synthesis_node").addEdge("synthesis_node", "evaluator_guardrail_node").addConditionalEdges("evaluator_guardrail_node", shouldRetryOrFinish, {
    synthesis_node: "synthesis_node",
    [END]: END
  });
  return workflow.compile({ checkpointer: sharedCheckpointer });
}
async function runLangGraphChat(req, opts) {
  const traceId = opts?.traceId || crypto2.randomUUID();
  const sessionId = opts?.sessionId || req.sessionId || `sess_${crypto2.createHash("sha1").update(`${req.lang}:${req.message}`).digest("hex").slice(0, 16)}`;
  return withOpenInferenceSpan(
    "daklak_langgraph_agent",
    {
      kind: OpenInferenceSpanKind8.AGENT,
      input: {
        message: req.message,
        lang: req.lang,
        isFollowUp: req.isFollowUp,
        sessionId,
        traceId
      },
      attributes: {
        "daklak.engine": "langgraph",
        "daklak.session_id": sessionId,
        "daklak.trace_id": traceId
      },
      formatOutput: (res) => ({
        intent: res.intent,
        status: res.status,
        followUpAction: res.followUpAction,
        toolsUsed: res.toolsUsed,
        graphNodesVisited: res.graphNodesVisited
      }),
      onSuccess: (span, res) => {
        span.setAttribute("daklak.intent", res.intent);
        span.setAttribute("daklak.provider", res.provider);
        if (res.toolsUsed) {
          span.setAttribute("daklak.tools_used", JSON.stringify(res.toolsUsed));
        }
        if (res.graphNodesVisited) {
          span.setAttribute("daklak.graph_nodes_visited", JSON.stringify(res.graphNodesVisited));
        }
      }
    },
    async () => {
      const app2 = buildDakLakLangGraph(opts);
      const finalState = await app2.invoke(
        {
          req,
          sessionId,
          traceId,
          plannedTools: [],
          clarificationOptions: void 0,
          localContext: void 0,
          tavilyContext: void 0,
          plannerResults: void 0,
          response: void 0,
          toolsUsed: [],
          graphNodesVisited: [],
          evalAttempts: 0,
          evalResult: void 0,
          needsEvalRetry: false,
          retryFeedback: []
        },
        {
          configurable: {
            thread_id: sessionId
          }
        }
      );
      const response = finalState.response;
      if (!response) {
        throw new Error("LangGraph execution completed without producing a response");
      }
      const finalResponse = {
        ...response,
        traceId,
        engine: "langgraph",
        toolsUsed: finalState.toolsUsed || [],
        graphNodesVisited: finalState.graphNodesVisited || []
      };
      traceMetadataStore.set(traceId, {
        traceId,
        sessionId,
        intake: finalState.intake,
        capacityPlan: finalState.plannerResults?.capacityPlan,
        budgetResult: finalState.plannerResults?.budgetResult,
        purposeSelection: finalState.plannerResults?.purposeSelection,
        evalResult: finalState.evalResult,
        toolsUsed: finalState.toolsUsed || [],
        graphNodesVisited: finalState.graphNodesVisited || [],
        retryCount: Math.max(0, (finalState.evalAttempts || 1) - 1)
      });
      return finalResponse;
    }
  );
}

// server/services/ai/aiChatbot.ts
var VALID_THEMES3 = ["coffee", "culture", "nature", "cuisine"];
var VALID_DURATIONS3 = ["2N1D", "3N2D", "4N3D+"];
var VALID_COMPANIONS3 = ["solo", "couple", "family", "friends"];
var VALID_BUDGETS3 = ["budget", "standard", "luxury"];
function sanitizeTheme2(val, fallback) {
  return VALID_THEMES3.includes(val) ? val : fallback;
}
function sanitizeDuration2(val, fallback) {
  return VALID_DURATIONS3.includes(val) ? val : fallback;
}
function sanitizeCompanion2(val, fallback) {
  return VALID_COMPANIONS3.includes(val) ? val : fallback;
}
function sanitizeBudget2(val, fallback) {
  return VALID_BUDGETS3.includes(val) ? val : fallback;
}
function detectPreferencesFallback(rawText, current) {
  const det = runPhase1IntakeDeterministic({
    message: rawText,
    lang: "vi",
    isFollowUp: true,
    currentState: current
  });
  return {
    duration: sanitizeDuration2(det.intake.duration, current.duration),
    companion: sanitizeCompanion2(det.intake.companionType, current.companion),
    budget: sanitizeBudget2(det.intake.budgetTier, current.budget),
    theme: sanitizeTheme2(det.intake.mainPurpose, current.theme)
  };
}
async function buildCmsCitationsForQa(lang, themeKey) {
  try {
    const posts = await queryRelevantPublishedPosts({ lang, themeKey, limit: 3 });
    return posts.map((p) => ({
      title: p.title,
      url: `/blog/${p.slug}`,
      snippet: p.excerpt,
      source: "cms"
    }));
  } catch {
    return [];
  }
}
async function persistTraceSafely(record) {
  try {
    await saveAiTrace(record);
  } catch (err) {
    console.warn(
      "[AI Trace] Failed to persist trace:",
      err instanceof Error ? err.message : err
    );
  }
}
async function runLocalFallbackChat(req, reason) {
  const lower = req.message.toLowerCase();
  const provider = reason ? `local-fallback (${reason})` : "local-fallback";
  const hasExplicitPlannerVerb = /(lên lịch|lịch trình mới|thiết kế|tạo tour|đổi sang|chuyển sang|cập nhật lịch|thêm điểm|bỏ điểm|xóa điểm|plan.*trip|create itinerary|new itinerary|muốn đi.*chơi)/i.test(
    lower
  );
  const looksLikeGeneralQuestion = isPrimaryAmenityOrInfoQuestion(lower) || !hasExplicitPlannerVerb || isQuestionOrInfoRequest(lower) || /(mùa nào|thời tiết|bao giờ|tháng mấy|ở đâu|ăn gì|món gì|đặc sản|giá vé|bao xa|di chuyển|cách đi|what|when|where|which|how|weather|season|best time)/i.test(
    lower
  );
  if (looksLikeGeneralQuestion) {
    const reply2 = await buildGroundedQaReplyDeterministic(req);
    const citations = await buildCmsCitationsForQa(req.lang, req.currentState.theme);
    return {
      intent: "general_qa",
      reply: reply2,
      shouldOpenPlanner: false,
      preferences: {
        theme: req.currentState.theme,
        duration: req.currentState.duration,
        companion: req.currentState.companion,
        budget: req.currentState.budget
      },
      resetItineraryToTheme: false,
      stopOperations: [],
      status: "completed",
      citations,
      provider,
      engine: "langgraph",
      ...req.draftIntake ? {
        draftIntake: req.draftIntake,
        ...req.draftIntake.missingFields?.length ? {
          clarificationOptions: buildClarificationOptions(
            req.lang,
            req.draftIntake.missingFields
          )
        } : {}
      } : {}
    };
  }
  const prefs = detectPreferencesFallback(req.message, req.currentState);
  const cat = plannerCatalog[prefs.theme];
  const bud = budgetMultipliers[prefs.budget];
  const reply = req.lang === "en" ? `Tailored "${cat.title}" (${prefs.duration} \u2022 ${companionLabels[prefs.companion]} \u2022 ${bud.label} budget). Route tip: ${cat.routeTip}` : `\u0110\xE3 thi\u1EBFt k\u1EBF h\xE0nh tr\xECnh "${cat.title}" (${prefs.duration} \u2022 ${companionLabels[prefs.companion]} \u2022 Ng\xE2n s\xE1ch ${bud.label}). M\u1EB9o tuy\u1EBFn \u0111\u01B0\u1EDDng: ${cat.routeTip}`;
  return {
    intent: "update_itinerary",
    reply,
    shouldOpenPlanner: true,
    preferences: prefs,
    resetItineraryToTheme: true,
    stopOperations: [],
    suggestedTab: "map",
    status: "completed",
    provider,
    engine: "langgraph"
  };
}
function deriveSessionId(req, fallbackTraceId) {
  if (typeof req.sessionId === "string" && req.sessionId.trim()) {
    return req.sessionId.trim();
  }
  const seedText = req.history?.[0]?.user?.trim() || req.draftIntake?.rawUserGoal?.split(" \u2014 ")[0]?.trim() || req.message?.trim();
  if (!seedText) return fallbackTraceId;
  const hash = crypto3.createHash("sha1").update(`${req.lang}:${seedText}`).digest("hex").slice(0, 16);
  return `sess_${hash}`;
}
async function handleAiChat(req) {
  const traceId = crypto3.randomUUID();
  const sessionId = deriveSessionId(req, traceId);
  const startedAt = Date.now();
  return withSessionScope(
    sessionId,
    () => withOpenInferenceSpan(
      "daklak_ai_concierge",
      {
        kind: OpenInferenceSpanKind9.AGENT,
        input: req.message,
        attributes: {
          "daklak.trace_id": traceId,
          "daklak.session_id": sessionId,
          "daklak.lang": req.lang,
          "daklak.is_follow_up": req.isFollowUp,
          "daklak.engine": "langgraph"
        },
        formatOutput: (res) => res.reply,
        onSuccess: (span, res) => {
          span.setAttribute("daklak.intent", res.intent);
          span.setAttribute("daklak.status", res.status || "completed");
          span.setAttribute("daklak.provider", res.provider);
          span.setAttribute("daklak.engine", res.engine || "langgraph");
          if (res.followUpAction) {
            span.setAttribute("daklak.follow_up_action", res.followUpAction);
          }
          if (res.toolsUsed) {
            span.setAttribute("daklak.tools_used", JSON.stringify(res.toolsUsed));
          }
          if (res.graphNodesVisited) {
            span.setAttribute("daklak.graph_nodes_visited", JSON.stringify(res.graphNodesVisited));
          }
        }
      },
      async () => {
        try {
          const finalResponse = await runLangGraphChat(req, { traceId, sessionId });
          const meta = getLangGraphTraceMetadata(traceId);
          await persistTraceSafely({
            traceId,
            lang: req.lang,
            userMessage: req.message,
            intent: finalResponse.intent,
            status: finalResponse.status || "completed",
            provider: finalResponse.provider,
            intake: meta?.intake || finalResponse.draftIntake,
            capacityPlan: meta?.capacityPlan,
            budgetResult: meta?.budgetResult,
            purposeSelection: meta?.purposeSelection,
            evalResult: meta?.evalResult,
            latencyMs: Date.now() - startedAt,
            retryCount: meta?.retryCount ?? 0,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            engine: finalResponse.engine || "langgraph",
            toolsUsed: finalResponse.toolsUsed,
            graphNodesVisited: finalResponse.graphNodesVisited
          });
          return finalResponse;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown AI workflow error";
          console.warn("[AI Chatbot] LangGraph pipeline failed, using local fallback:", message);
          const fallback = await runLocalFallbackChat(req, "fallback");
          fallback.traceId = traceId;
          fallback.status = "completed";
          fallback.engine = "langgraph";
          fallback.toolsUsed = fallback.toolsUsed || [];
          fallback.graphNodesVisited = fallback.graphNodesVisited || ["fallback"];
          await persistTraceSafely({
            traceId,
            lang: req.lang,
            userMessage: req.message,
            intent: fallback.intent,
            status: "completed",
            provider: fallback.provider,
            latencyMs: Date.now() - startedAt,
            retryCount: 0,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            engine: "langgraph",
            toolsUsed: fallback.toolsUsed,
            graphNodesVisited: fallback.graphNodesVisited
          });
          return fallback;
        }
      }
    )
  );
}

// server/routes/aiRoutes.ts
var aiRouter = Router3();
var rateBuckets = /* @__PURE__ */ new Map();
function isRateLimited(clientKey) {
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [key, entry] of rateBuckets.entries()) {
      if (now > entry.resetAt) {
        rateBuckets.delete(key);
      }
    }
  }
  const existing = rateBuckets.get(clientKey);
  if (!existing || now > existing.resetAt) {
    rateBuckets.set(clientKey, { count: 1, resetAt: now + AI_CHAT_RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (existing.count >= AI_CHAT_RATE_LIMIT_MAX) {
    return true;
  }
  existing.count += 1;
  return false;
}
function asTheme(val) {
  return val === "culture" || val === "nature" || val === "cuisine" ? val : "coffee";
}
function asDuration(val) {
  return val === "2N1D" || val === "4N3D+" ? val : "3N2D";
}
function asCompanion(val) {
  return val === "solo" || val === "family" || val === "friends" ? val : "couple";
}
function asBudget(val) {
  return val === "budget" || val === "luxury" ? val : "standard";
}
function asAgenticIntent(val) {
  return val === "general_qa" || val === "plan_trip" || val === "modify_stops" ? val : void 0;
}
function asExpenseCategory(val) {
  return val === "stay" || val === "transit" || val === "food" || val === "activity" ? val : null;
}
function sanitizeDraftIntake(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return void 0;
  }
  const r = raw;
  const sanitized = {};
  const intent = asAgenticIntent(r.intent);
  if (intent) sanitized.intent = intent;
  if (r.travelersCount === null) {
    sanitized.travelersCount = null;
  } else if (typeof r.travelersCount === "number" && Number.isFinite(r.travelersCount) && r.travelersCount >= 1) {
    sanitized.travelersCount = Math.min(50, Math.round(r.travelersCount));
  }
  if (r.companionType === null) {
    sanitized.companionType = null;
  } else if (r.companionType === "solo" || r.companionType === "couple" || r.companionType === "family" || r.companionType === "friends") {
    sanitized.companionType = r.companionType;
  }
  if (r.travelDates === null) {
    sanitized.travelDates = null;
  } else if (typeof r.travelDates === "string") {
    const trimmed = r.travelDates.trim().slice(0, 120);
    if (trimmed) sanitized.travelDates = trimmed;
  }
  if (r.duration === "2N1D" || r.duration === "3N2D" || r.duration === "4N3D+") {
    sanitized.duration = r.duration;
  }
  if (r.totalBudgetVnd === null) {
    sanitized.totalBudgetVnd = null;
  } else if (typeof r.totalBudgetVnd === "number" && Number.isFinite(r.totalBudgetVnd) && r.totalBudgetVnd >= 0) {
    sanitized.totalBudgetVnd = Math.min(1e9, Math.round(r.totalBudgetVnd));
  }
  if (r.budgetTier === "budget" || r.budgetTier === "standard" || r.budgetTier === "luxury") {
    sanitized.budgetTier = r.budgetTier;
  }
  if (r.mainPurpose === "coffee" || r.mainPurpose === "culture" || r.mainPurpose === "nature" || r.mainPurpose === "cuisine") {
    sanitized.mainPurpose = r.mainPurpose;
  }
  if (Array.isArray(r.secondaryInterests)) {
    sanitized.secondaryInterests = r.secondaryInterests.filter((item) => typeof item === "string").map((item) => item.trim().slice(0, 60)).filter(Boolean).slice(0, 8);
  }
  if (Array.isArray(r.missingFields)) {
    const validMissing = r.missingFields.filter(
      (f) => f === "budget" || f === "dates" || f === "travelers"
    );
    sanitized.missingFields = Array.from(new Set(validMissing)).slice(0, 3);
  }
  if (typeof r.needsClarification === "boolean") {
    sanitized.needsClarification = r.needsClarification;
  }
  if (typeof r.clarificationQuestion === "string") {
    const q = r.clarificationQuestion.trim().slice(0, 400);
    if (q) sanitized.clarificationQuestion = q;
  }
  if (typeof r.rawUserGoal === "string") {
    const goal = r.rawUserGoal.trim().slice(0, 500);
    if (goal) sanitized.rawUserGoal = goal;
  }
  return Object.keys(sanitized).length > 0 ? sanitized : void 0;
}
function sanitizeCurrentExpenses(raw) {
  if (!Array.isArray(raw)) {
    return void 0;
  }
  const items = [];
  for (const entry of raw.slice(0, 12)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const item = entry;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 120) : "";
    const cat = asExpenseCategory(item.cat);
    const amount = typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount >= 0 ? Math.min(1e9, Math.round(item.amount)) : null;
    if (!title || !cat || amount === null) continue;
    items.push({ title, cat, amount });
  }
  return items.length > 0 ? items : void 0;
}
function sanitizeBackpackItems(raw) {
  if (!Array.isArray(raw)) {
    return void 0;
  }
  const items = [];
  for (const entry of raw.slice(0, 15)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const item = entry;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 120) : "";
    if (!title) continue;
    const location = typeof item.location === "string" ? item.location.trim().slice(0, 120) : "\u0110\u1EAFk L\u1EAFk";
    const themeKey = asTheme(item.themeKey);
    const category = typeof item.category === "string" ? item.category.trim().slice(0, 80) : void 0;
    const areaCluster = typeof item.areaCluster === "string" ? item.areaCluster.trim().slice(0, 80) : void 0;
    const seasonHint = typeof item.seasonHint === "string" ? item.seasonHint.trim().slice(0, 80) : void 0;
    items.push({
      title,
      location,
      themeKey,
      ...category ? { category } : {},
      ...areaCluster ? { areaCluster } : {},
      ...seasonHint ? { seasonHint } : {}
    });
  }
  return items.length > 0 ? items : void 0;
}
aiRouter.get("/status", (_req, res) => {
  res.json({
    configured: Boolean(getGeminiApiKey()),
    model: GEMINI_MODEL,
    decisionModel: GEMINI_DECISION_MODEL || void 0,
    tavilyConfigured: Boolean(getTavilyApiKey()),
    tavilySettings: {
      timeoutMs: TAVILY_TIMEOUT_MS,
      searchDepth: TAVILY_SEARCH_DEPTH,
      includeAnswer: TAVILY_INCLUDE_ANSWER,
      maxResults: TAVILY_MAX_RESULTS,
      country: TAVILY_COUNTRY || void 0
    },
    engine: "langgraph",
    tools: [...LANGGRAPH_TOOL_NAMES]
  });
});
aiRouter.post("/chat", async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (isRateLimited(clientIp)) {
      res.status(429).json({
        error: "B\u1EA1n \u0111ang g\u1EEDi y\xEAu c\u1EA7u h\u01A1i nhanh. Vui l\xF2ng th\u1EED l\u1EA1i sau \xEDt ph\xFAt."
      });
      return;
    }
    const body = req.body || {};
    const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
    if (!rawMessage) {
      res.status(400).json({ error: "N\u1ED9i dung tin nh\u1EAFn kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng." });
      return;
    }
    const message = rawMessage.slice(0, AI_CHAT_MAX_MESSAGE_LENGTH);
    const lang = body.lang === "en" ? "en" : "vi";
    const isFollowUp = Boolean(body.isFollowUp);
    const sessionId = typeof body.sessionId === "string" && body.sessionId.trim() ? body.sessionId.trim().slice(0, 80) : void 0;
    const rawState = body.currentState || {};
    const days = Array.isArray(rawState.days) ? rawState.days.slice(0, 6).map((d) => ({
      day: typeof d?.day === "string" ? d.day.slice(0, 40) : "",
      title: typeof d?.title === "string" ? d.title.slice(0, 120) : "",
      slots: Array.isArray(d?.slots) ? d.slots.slice(0, 10).map((s) => ({
        title: typeof s?.title === "string" ? s.title.slice(0, 120) : "",
        location: typeof s?.location === "string" ? s.location.slice(0, 120) : "",
        time: typeof s?.time === "string" ? s.time.slice(0, 40) : ""
      })) : []
    })) : [];
    const history = Array.isArray(body.history) ? body.history.slice(-10).filter((h) => h && typeof h.user === "string" && typeof h.reply === "string").map((h) => ({
      user: h.user.slice(0, 800),
      reply: h.reply.slice(0, 1200)
    })) : [];
    const draftIntake = sanitizeDraftIntake(body.draftIntake);
    const currentExpenses = sanitizeCurrentExpenses(body.currentExpenses);
    const backpackItems = sanitizeBackpackItems(body.backpackItems);
    const chatRequest = {
      message,
      lang,
      isFollowUp,
      currentState: {
        theme: asTheme(rawState.theme),
        duration: asDuration(rawState.duration),
        companion: asCompanion(rawState.companion),
        budget: asBudget(rawState.budget),
        days
      },
      history,
      ...sessionId ? { sessionId } : {},
      ...draftIntake ? { draftIntake } : {},
      ...currentExpenses ? { currentExpenses } : {},
      ...backpackItems ? { backpackItems } : {}
    };
    const result = await handleAiChat(chatRequest);
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: "\u0110\xE3 x\u1EA3y ra l\u1ED7i khi x\u1EED l\xFD y\xEAu c\u1EA7u tr\u1EE3 l\xFD AI." });
  }
});
aiRouter.post("/feedback", async (req, res) => {
  try {
    const body = req.body || {};
    const trace2 = await submitAiTraceFeedback({
      traceId: typeof body.traceId === "string" ? body.traceId : "",
      rating: body.rating,
      comment: typeof body.comment === "string" ? body.comment : void 0
    });
    res.json({ ok: true, trace: trace2 });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: "Kh\xF4ng th\u1EC3 l\u01B0u ph\u1EA3n h\u1ED3i \u0111\xE1nh gi\xE1." });
  }
});
aiRouter.get("/traces", requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const status = typeof req.query.status === "string" ? req.query.status : void 0;
    const intent = typeof req.query.intent === "string" ? req.query.intent : void 0;
    const result = await listAiTraces({ limit, offset, status, intent });
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: "Kh\xF4ng th\u1EC3 t\u1EA3i danh s\xE1ch AI traces." });
  }
});

// server/routes/authRoutes.ts
import { Router as Router4 } from "express";
var authRouter = Router4();
authRouter.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 email v\xE0 m\u1EADt kh\u1EA9u." });
      return;
    }
    const user = await findUserForLoginByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: "Email ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c." });
      return;
    }
    const isActive = user.is_active === true || user.is_active === 1;
    if (!isActive) {
      res.status(403).json({ error: "T\xE0i kho\u1EA3n n\xE0y \u0111\xE3 b\u1ECB t\u1EA1m kh\xF3a." });
      return;
    }
    const { token } = await createSession(Number(user.id));
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" || IS_VERCEL,
      path: "/",
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1e3
    });
    res.json({
      token,
      user: {
        id: Number(user.id),
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});
authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = extractSessionTokenFromRequest(req);
    if (token) await deleteSession(token);
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
authRouter.get("/me", async (req, res, next) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp." });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// server/routes/publicPostsRoutes.ts
import { Router as Router5 } from "express";
var publicPostsRouter = Router5();
publicPostsRouter.get("/", async (req, res, next) => {
  try {
    const lang = req.query.lang === "en" ? "en" : "vi";
    const section = typeof req.query.section === "string" ? req.query.section : void 0;
    res.json({
      posts: await listPublicPosts(lang, section)
    });
  } catch (err) {
    next(err);
  }
});
publicPostsRouter.get("/:slug", attachOptionalAuth, async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    const lang = req.query.lang === "en" ? "en" : "vi";
    const isPreview = req.query.preview === "1";
    const result = await getPublicPostBySlug(slug, lang, isPreview, req.authUser);
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});

// server/routes/uploadRoutes.ts
import crypto4 from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";
import { Router as Router6 } from "express";
import multer from "multer";
var allowedMimeToExt = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  // 4MB (safe within Vercel 4.5MB body limit)
  fileFilter: (_req, file, cb) => {
    if (allowedMimeToExt[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error("Ch\u1EC9 h\u1ED7 tr\u1EE3 \u0111\u1ECBnh d\u1EA1ng \u1EA3nh JPG, PNG, WebP ho\u1EB7c GIF (t\u1ED1i \u0111a 4MB)."));
    }
  }
});
var uploadRouter = Router6();
uploadRouter.post("/", requireAuth, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Upload th\u1EA5t b\u1EA1i." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Kh\xF4ng c\xF3 t\u1EC7p \u1EA3nh n\xE0o \u0111\u01B0\u1EE3c t\u1EA3i l\xEAn." });
      return;
    }
    const ext = allowedMimeToExt[req.file.mimetype] || ".jpg";
    const filename = `${Date.now()}-${crypto4.randomBytes(6).toString("hex")}${ext}`;
    try {
      if (isUsingSupabase()) {
        const supabase = getSupabaseAdmin();
        const storagePath = `cms/${filename}`;
        const { error: uploadErr } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: "31536000",
          upsert: false
        });
        if (uploadErr) {
          res.status(500).json({ error: `Kh\xF4ng th\u1EC3 t\u1EA3i \u1EA3nh l\xEAn Supabase Storage: ${uploadErr.message}` });
          return;
        }
        const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(storagePath);
        res.json({
          url: data.publicUrl,
          filename
        });
        return;
      }
      fs3.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs3.writeFileSync(path3.join(UPLOADS_DIR, filename), req.file.buffer);
      res.json({
        url: `/uploads/${path3.basename(filename)}`,
        filename
      });
    } catch (uploadError) {
      res.status(500).json({
        error: uploadError instanceof Error ? uploadError.message : "Upload \u1EA3nh th\u1EA5t b\u1EA1i."
      });
    }
  });
});

// server/app.ts
try {
  initArizeTelemetry();
} catch (err) {
  console.warn("[Arize AX] Telemetry initialization skipped:", err instanceof Error ? err.message : err);
}
var seedPromise = null;
function ensureSeedReady() {
  if (!seedPromise) {
    seedPromise = ensureSeedData().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
var app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "4mb" }));
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: isUsingSupabase() ? "supabase" : "sqlite"
  });
});
app.use("/api", async (_req, _res, next) => {
  try {
    await ensureSeedReady();
    next();
  } catch (err) {
    next(err);
  }
});
if (!isUsingSupabase()) {
  try {
    fs4.mkdirSync(UPLOADS_DIR, { recursive: true });
    app.use("/uploads", express.static(UPLOADS_DIR));
  } catch {
  }
}
app.use("/api/auth", authRouter);
app.use("/api/ai", aiRouter);
app.use("/api/posts", publicPostsRouter);
app.use("/api/admin/posts", adminPostsRouter);
app.use("/api/admin/uploads", uploadRouter);
app.use("/api/admin/users", adminUsersRouter);
if (!IS_VERCEL && process.env.NODE_ENV === "production" && fs4.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path4.join(DIST_DIR, "index.html"));
  });
}
app.use((err, req, res, _next) => {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return;
  const message = err instanceof Error && process.env.NODE_ENV !== "production" ? err.message : "\u0110\xE3 x\u1EA3y ra l\u1ED7i m\xE1y ch\u1EE7 n\u1ED9i b\u1ED9.";
  res.status(500).json({ error: message });
});
var app_default = app;
export {
  app,
  app_default as default,
  ensureSeedReady
};
/*! Bundled license information:

is-plain-object/dist/is-plain-object.js:
  (*!
   * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
   *
   * Copyright (c) 2014-2017, Jon Schlinkert.
   * Released under the MIT License.
   *)
*/
