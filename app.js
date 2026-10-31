/* ====== Kontak: ubah di sini ====== */
var CONTACTS = [
  {label:"Discord", value:"@vynkrn"},
  {label:"GitHub", value:"github.com/MFXDEV13", href:"https://github.com/MFXDEV13"},
  {label:"Email", value:"miuchen13@gmail.com", href:"mailto:miuchen13@gmail.com"}
];
/* ================================== */

var PROJECTS = [], loadFailed = false;
var cats = ["Semua","Plugin","Bot","Web","Lainnya"], active = "Semua", lastBtn = null;
var AUTH = null; try{AUTH = sessionStorage.getItem("auth");}catch(err){}
var isEditor = false, editing = -1;

var fEl = document.getElementById("filters"), lEl = document.getElementById("list"), modal = document.getElementById("modal");
var addBtn = document.getElementById("addBtn"), admEl = document.getElementById("adm"), frm = document.getElementById("frm"), F = frm.elements, msgEl = document.getElementById("msg");
var lgForm = document.getElementById("lgForm"), lgMsg = document.getElementById("lgMsg"), outBtn = document.getElementById("logout"), openBtn = document.getElementById("openLogin"), htmlEl = document.documentElement;

function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML.replace(/"/g,"&quot;");}
function tagsHtml(a){return (a||[]).map(function(x){return "<span>"+esc(x)+"</span>";}).join("");}
function say(t){msgEl.textContent = t;}

/* ---------- Server ---------- */
function request(method, path, body){
  var opt = {method: method, headers: {}};
  if(AUTH) opt.headers.Authorization = "Basic " + AUTH;
  if(body !== undefined){opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body);}
  return fetch(path, opt);
}
function loadProjects(){
  return request("GET", "/api/projects")
    .then(function(r){if(!r.ok) throw 0; return r.json();})
    .then(function(d){PROJECTS = Array.isArray(d) ? d : [];})
    .catch(function(){PROJECTS = []; loadFailed = true;});
}
function persist(){
  say("Menyimpan…");
  request("PUT", "/api/projects", PROJECTS).then(function(r){
    if(r.status === 401){logout(); throw "Sesi admin habis, silakan login lagi.";}
    if(!r.ok) throw "Gagal menyimpan, coba lagi.";
    return r.json();
  }).then(function(d){
    PROJECTS = d; renderFilters(); renderList(); say("Tersimpan.");
  }).catch(function(m){say(typeof m === "string" ? m : "Gagal menyimpan, periksa koneksi.");});
}

/* ---------- Tampilan ---------- */
function adminBtns(i){
  if(!isEditor) return "";
  return '<div class="tools itools"><button type="button" class="mini" data-act="edit" data-i="'+i+'">Edit</button><button type="button" class="mini del" data-act="del" data-i="'+i+'">Hapus</button></div>';
}
function renderList(){
  var rows = [];
  PROJECTS.forEach(function(p,i){
    if(active==="Semua" || p.cat===active) rows.push('<li class="item" data-i="'+i+'"><div class="top"><button type="button" class="ttl">'+esc(p.name)+'</button><span class="cat">'+esc(p.cat)+'</span></div><p>'+esc(p.desc)+'</p><div class="tags">'+tagsHtml(p.tech)+'</div>'+adminBtns(i)+'</li>');
  });
  var empty = loadFailed ? "Daftar proyek belum bisa dimuat." : (PROJECTS.length ? "Belum ada proyek di kategori ini." : "Proyek akan segera ditambahkan di sini.");
  lEl.innerHTML = rows.length ? rows.join("") : '<li class="empty">'+empty+'</li>';
}
function renderFilters(){
  fEl.innerHTML = ""; fEl.style.display = PROJECTS.length ? "" : "none";
  cats.forEach(function(c){
    var b = document.createElement("button");
    b.type = "button"; b.textContent = c;
    b.setAttribute("aria-pressed", String(c===active));
    b.onclick = function(){active=c; renderFilters(); renderList();};
    fEl.appendChild(b);
  });
}
function renderContacts(){
  document.getElementById("contacts").innerHTML = CONTACTS.map(function(c){
    var v = c.href ? '<a href="'+esc(c.href)+'" target="_blank" rel="noopener">'+esc(c.value)+'</a>' : esc(c.value);
    return '<span><span class="k">'+esc(c.label)+':</span> '+v+'</span>';
  }).join("");
}

/* ---------- Detail proyek ---------- */
function openDetail(p, btn){
  lastBtn = btn || null;
  document.getElementById("mCat").textContent = p.cat;
  document.getElementById("mTitle").textContent = p.name;
  document.getElementById("mDesc").textContent = p.desc || "Belum ada deskripsi.";
  document.getElementById("mTags").innerHTML = tagsHtml(p.tech);
  document.getElementById("mLink").innerHTML = /^https?:\/\//i.test(p.link||"") ? '<a class="btn fill" href="'+esc(p.link)+'" target="_blank" rel="noopener">Buka proyek</a>' : "";
  modal.hidden = false;
  htmlEl.style.overflow = "hidden";
  modal.querySelector(".mbox").focus();
}
function closeDetail(){
  modal.hidden = true;
  htmlEl.style.overflow = "";
  if(lastBtn && document.body.contains(lastBtn)) lastBtn.focus();
}
document.getElementById("mClose").onclick = closeDetail;
modal.addEventListener("click", function(e){if(e.target === modal) closeDetail();});

/* ---------- Login admin ---------- */
function syncAuth(){outBtn.hidden = !AUTH; openBtn.hidden = !!AUTH;}
function initEditor(){
  isEditor = !!AUTH;
  addBtn.hidden = !isEditor;
  if(!isEditor) admEl.hidden = true;
  renderList();
}
function closeLogin(){htmlEl.classList.remove("asking"); lgMsg.textContent = ""; lgForm.reset();}
function logout(){
  AUTH = null; try{sessionStorage.removeItem("auth");}catch(err){}
  syncAuth(); initEditor();
}
openBtn.onclick = function(){htmlEl.classList.add("asking"); lgForm.elements.user.focus();};
document.getElementById("guestBtn").onclick = closeLogin;
outBtn.onclick = logout;
lgForm.addEventListener("submit", function(e){
  e.preventDefault();
  var token;
  try{token = btoa(lgForm.elements.user.value.trim() + ":" + lgForm.elements.pass.value);}
  catch(err){lgMsg.textContent = "Karakter tidak didukung."; return;}
  lgMsg.textContent = "Memeriksa…";
  fetch("/api/projects?check", {headers:{Authorization:"Basic " + token}}).then(function(r){
    if(!r.ok){lgMsg.textContent = r.status === 401 ? "Username atau password salah." : "Server belum siap."; return;}
    AUTH = token; try{sessionStorage.setItem("auth", token);}catch(err){}
    closeLogin(); syncAuth(); initEditor();
  }).catch(function(){lgMsg.textContent = "Tidak bisa terhubung ke server.";});
});

/* ---------- Tambah / edit / hapus ---------- */
function resetForm(){editing = -1; frm.reset();}
addBtn.onclick = function(){admEl.hidden = !admEl.hidden; if(!admEl.hidden){resetForm(); say(""); F.pname.focus();}};
document.getElementById("cancel").onclick = function(){resetForm(); say(""); admEl.hidden = true;};

lEl.addEventListener("click", function(e){
  var b = e.target.closest("button[data-act]");
  if(b){
    if(!isEditor) return;
    var i = +b.dataset.i, p = PROJECTS[i]; if(!p) return;
    if(b.dataset.act === "edit"){
      editing = i; F.pname.value = p.name; F.pcat.value = p.cat; F.pdesc.value = p.desc || "";
      F.ptech.value = (p.tech||[]).join(", "); F.plink.value = p.link || "";
      admEl.hidden = false; say("Mengedit: "+p.name); admEl.scrollIntoView({behavior:"smooth", block:"center"}); F.pname.focus();
    } else {
      if(b.dataset.sure !== "1"){b.dataset.sure = "1"; b.textContent = "Yakin hapus?"; return;}
      PROJECTS.splice(i,1); renderFilters(); renderList(); persist();
    }
    return;
  }
  if(e.target.closest("a")) return;
  var li = e.target.closest("li.item"); if(!li) return;
  openDetail(PROJECTS[+li.dataset.i], li.querySelector(".ttl"));
});
frm.addEventListener("submit", function(e){
  e.preventDefault();
  var d = {
    name: F.pname.value.trim(), cat: F.pcat.value, desc: F.pdesc.value.trim(),
    tech: F.ptech.value.split(",").map(function(x){return x.trim();}).filter(Boolean),
    link: F.plink.value.trim()
  };
  if(!d.name){say("Nama proyek wajib diisi."); return;}
  if(editing >= 0){PROJECTS[editing] = d;}else{PROJECTS.push(d);}
  resetForm(); admEl.hidden = true; renderFilters(); renderList(); persist();
});

document.addEventListener("keydown", function(e){
  if(e.key !== "Escape") return;
  if(!modal.hidden) closeDetail();
  else if(htmlEl.classList.contains("asking")) closeLogin();
});

/* ---------- Mulai ---------- */
document.getElementById("yr").textContent = new Date().getFullYear();
renderFilters(); renderList(); renderContacts(); syncAuth(); initEditor();
loadProjects().then(function(){renderFilters(); renderList();});

/* ---------- Animasi: muncul perlahan saat di-scroll ---------- */
var rvEls = [].slice.call(document.querySelectorAll("#top h1,#top .lead,#top .btns,#tentang,#proyek,#kontak,footer"));
rvEls.forEach(function(el, i){el.classList.add("rv"); if(i < 3) el.style.transitionDelay = (i*120)+"ms";});
if("IntersectionObserver" in window){
  var io = new IntersectionObserver(function(en){
    en.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in"); io.unobserve(e.target);}});
  }, {threshold:.05, rootMargin:"0px 0px -40px 0px"});
  rvEls.forEach(function(el){io.observe(el);});
}else{rvEls.forEach(function(el){el.classList.add("in");});}

/* ---------- Animasi: menu aktif mengikuti scroll ---------- */
(function(){
  var links = [].slice.call(document.querySelectorAll("nav a[href^='#']"));
  function setOn(id){
    links.forEach(function(a){
      var on = a.getAttribute("href") === "#"+id;
      a.classList.toggle("on", on);
      if(on){a.setAttribute("aria-current","true");}else{a.removeAttribute("aria-current");}
    });
  }
  links.forEach(function(a){a.addEventListener("click", function(){setOn(a.getAttribute("href").slice(1));});});
  if(!("IntersectionObserver" in window)) return;
  var io2 = new IntersectionObserver(function(en){
    en.forEach(function(e){if(e.isIntersecting) setOn(e.target.id);});
  }, {rootMargin:"-40% 0px -55% 0px"});
  ["tentang","proyek","kontak"].forEach(function(id){var el = document.getElementById(id); if(el) io2.observe(el);});
})();

/* ---------- Animasi: efek mengetik di judul ---------- */
(function(){
  var h = document.querySelector("#top h1");
  if(!h || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  h.setAttribute("aria-label", h.textContent);
  var chars = [];
  function split(node){
    [].slice.call(node.childNodes).forEach(function(k){
      if(k.nodeType === 3){
        var f = document.createDocumentFragment();
        k.textContent.split("").forEach(function(c){
          if(c === " "){f.appendChild(document.createTextNode(" ")); return;}
          var s = document.createElement("span");
          s.textContent = c; s.style.visibility = "hidden"; s.setAttribute("aria-hidden","true");
          f.appendChild(s); chars.push(s);
        });
        node.replaceChild(f, k);
      } else if(k.nodeType === 1){split(k);}
    });
  }
  split(h); h.classList.add("typing");
  setTimeout(function(){
    var i = 0, t = setInterval(function(){
      if(i < chars.length){chars[i++].style.visibility = "visible";}
      else{clearInterval(t); setTimeout(function(){h.classList.remove("typing");}, 900);}
    }, 45);
  }, 400);
})();