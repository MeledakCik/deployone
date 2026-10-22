/**
 * Skrip kecil (vanilla JS, tanpa library) yang ikut tertanam di website hasil AI Web Builder
 * HANYA untuk jenis usaha yang punya katalog (UMKM). Isinya:
 *  - katalog produk dengan cari + filter kategori,
 *  - keranjang → pesan lewat WhatsApp,
 *  - mode kelola (CRUD): tambah / ubah / hapus produk, ekspor-impor JSON, unduh situs versi terbaru.
 *    Dibuka lewat tambahan #kelola di akhir link (tidak ditampilkan ke pengunjung biasa).
 *
 * Penyimpanan: localStorage di browser pemilik (bukan database bersama). Pengunjung lain tetap melihat
 * versi yang dipublikasikan; untuk memperbarui, pemilik memakai "Unduh situs" lalu upload ulang.
 *
 * Aturan penulisan file ini: dipakai sebagai String.raw, jadi JANGAN pakai backtick atau ${ di dalamnya.
 * Semua teks dari data dipasang lewat textContent (bukan innerHTML) agar aman dari XSS.
 */
export const SHOP_RUNTIME_JS = String.raw`(function(){
"use strict";
var D;try{D=JSON.parse(document.getElementById("wb-data").textContent)}catch(e){return}
if(!D||!D.shop)return;
var KEY="wb:"+D.key,mem={};
function sget(k){try{var v=localStorage.getItem(k);if(v!=null)return v}catch(e){}return mem[k]==null?null:mem[k]}
function sset(k,v){mem[k]=v;try{localStorage.setItem(k,v)}catch(e){}}
function sdel(k){delete mem[k];try{localStorage.removeItem(k)}catch(e){}}
function load(k,fb){try{var v=JSON.parse(sget(k));return v==null?fb:v}catch(e){return fb}}
var items=load(KEY+":items",null);if(!Array.isArray(items))items=D.items.slice();
var cart=load(KEY+":cart",{});if(!cart||typeof cart!=="object")cart={};
var state={q:"",cat:"",admin:false};
var root=document.documentElement;
function $(s){return document.querySelector(s)}
function h(tag,p,kids){var e=document.createElement(tag);if(p)for(var k in p){var v=p[k];if(v==null||v===false)continue;if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else if(k.slice(0,2)==="on")e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?"":v)}(kids||[]).forEach(function(c){if(c==null||c===false)return;e.appendChild(typeof c==="string"?document.createTextNode(c):c)});return e}
function ic(n,cls){var s=h("span",{class:"ic "+(cls||""),"aria-hidden":"true"});s.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(D.icons[n]||D.icons.package||"")+"</svg>";return s}
function rp(n){return"Rp "+String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,".")}
function price(it){return it.price>0?rp(it.price):"Tanya harga"}
function saveItems(){sset(KEY+":items",JSON.stringify(items))}
function saveCart(){sset(KEY+":cart",JSON.stringify(cart))}
function uid(){return"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function find(id){for(var i=0;i<items.length;i++)if(items[i].id===id)return items[i];return null}
function toast(msg){var t=$("#wb-toast");if(!t)return;t.textContent=msg;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},2400)}
function okImg(u){return typeof u==="string"&&(/^https?:\/\/[^\s"'<>]+$/i.test(u)||/^assets\/img\/[a-z0-9._-]+$/i.test(u)||/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(u))}

/* ---------- katalog ---------- */
function cats(){var seen={},out=[];items.forEach(function(i){if(i.category&&!seen[i.category]){seen[i.category]=1;out.push(i.category)}});return out}
function renderCats(){var box=$("#wb-cats");if(!box)return;box.textContent="";var list=cats();if(list.length<2){return}
 [""].concat(list).forEach(function(c){box.appendChild(h("button",{type:"button",class:"cat"+(state.cat===c?" on":""),text:c||"Semua","aria-pressed":state.cat===c?"true":"false",onclick:function(){state.cat=c;renderGrid();renderCats()}}))})}
function card(it){
 var media=okImg(it.img)?h("div",{class:"pimg"},[h("img",{src:it.img,alt:"",loading:"lazy",referrerpolicy:"no-referrer"})]):h("div",{class:"pico"},[ic(it.icon||"package")]);
 var body=h("div",{class:"pbody"},[(it.tag||it.category)?h("div",{class:"ptags"},[it.tag?h("span",{class:"ptag hot",text:it.tag}):null,it.category?h("span",{class:"ptag",text:it.category}):null]):null,h("h3",{text:it.name}),it.desc?h("p",{text:it.desc}):null]);
 var foot=h("div",{class:"pfoot"},[h("strong",{class:"pprice",text:price(it)}),h("button",{type:"button",class:"btn sm add","aria-label":"Tambah "+it.name+" ke keranjang",onclick:function(){add(it.id)}},[ic("plus"),"Tambah"])]);
 var el=h("article",{class:"card prod"+(it.size==="large"?" large":"")},[media,body,foot]);
 if(state.admin){el.appendChild(h("div",{class:"padm"},[
  h("button",{type:"button",class:"ib","aria-label":"Ubah "+it.name,onclick:function(){openForm(it.id)}},[ic("pencil")]),
  h("button",{type:"button",class:"ib bad","aria-label":"Hapus "+it.name,onclick:function(){askDelete(it.id)}},[ic("trash-2")])]))}
 return el}
function renderGrid(){var g=$("#wb-grid");if(!g)return;g.textContent="";
 var q=state.q.toLowerCase(),n=0;
 items.forEach(function(it){if(state.cat&&it.category!==state.cat)return;if(q&&(it.name+" "+(it.desc||"")+" "+(it.category||"")).toLowerCase().indexOf(q)<0)return;g.appendChild(card(it));n++});
 if(state.admin)g.appendChild(h("button",{type:"button",class:"card addnew",onclick:function(){openForm()}},[ic("plus"),h("span",{text:"Tambah produk"})]));
 if(!n&&!state.admin)g.appendChild(h("p",{class:"empty",text:items.length?"Tidak ada produk yang cocok.":"Belum ada produk."}));
 var c=$("#wb-total-items");if(c)c.textContent=items.length+" produk"}

/* ---------- keranjang ---------- */
function cartLines(){var out=[];for(var id in cart){var it=find(id);if(it&&cart[id]>0)out.push({it:it,q:cart[id]})}return out}
function add(id){cart[id]=(cart[id]||0)+1;saveCart();renderCart();toast("Ditambahkan ke keranjang")}
function setQty(id,q){if(q<=0)delete cart[id];else cart[id]=Math.min(q,99);saveCart();renderCart()}
function orderText(){var ls=cartLines(),t=0,s="Halo "+D.brand+", saya mau pesan:\n";ls.forEach(function(l){var sub=l.it.price*l.q;t+=sub;s+="- "+l.q+"x "+l.it.name+(l.it.price>0?" ("+rp(sub)+")":"")+"\n"});if(t>0)s+="Total: "+rp(t)+"\n";return s+"Terima kasih!"}
function renderCart(){
 var ls=cartLines(),n=0,total=0,unknown=false;ls.forEach(function(l){n+=l.q;total+=l.it.price*l.q;if(!(l.it.price>0))unknown=true});
 var b=$("#wb-count");if(b){b.textContent=String(n);b.style.display=n?"":"none"}
 var box=$("#wb-lines");if(!box)return;box.textContent="";
 if(!ls.length){box.appendChild(h("p",{class:"empty",text:"Keranjang masih kosong."}))}
 ls.forEach(function(l){box.appendChild(h("div",{class:"line"},[
  h("div",{class:"lname"},[h("b",{text:l.it.name}),h("small",{text:price(l.it)})]),
  h("div",{class:"qty"},[h("button",{type:"button","aria-label":"Kurangi",onclick:function(){setQty(l.it.id,l.q-1)}},[ic("minus")]),h("span",{text:String(l.q)}),h("button",{type:"button","aria-label":"Tambah",onclick:function(){setQty(l.it.id,l.q+1)}},[ic("plus")])])]))});
 var tt=$("#wb-sum");if(tt)tt.textContent=ls.length?rp(total)+(unknown?" + item tanya harga":""):"-";
 var go=$("#wb-order");if(go)go.disabled=!ls.length}
function toggleCart(open){var c=$("#wb-cart");if(!c)return;var on=open==null?!c.classList.contains("open"):open;c.classList.toggle("open",on);c.setAttribute("aria-hidden",on?"false":"true")}
function order(){var t=orderText();
 if(D.wa){window.open("https://wa.me/"+D.wa+"?text="+encodeURIComponent(t),"_blank","noopener");return}
 var done=function(){toast("Pesanan disalin. Kirim ke penjual.")};
 try{navigator.clipboard.writeText(t).then(done,function(){toast("Tidak bisa menyalin otomatis.")})}catch(e){toast("Tidak bisa menyalin otomatis.")}}

/* ---------- mode kelola (CRUD) ---------- */
function setAdmin(on){state.admin=on;root.classList.toggle("wb-admin",on);if(on)sset(KEY+":admin","1");else sdel(KEY+":admin");renderGrid()}
function modal(title,bodyEl,actions){
 closeModal();
 var m=h("div",{class:"modal",id:"wb-modal",role:"dialog","aria-modal":"true","aria-label":title},[h("div",{class:"mback",onclick:closeModal}),h("div",{class:"mbox"},[h("div",{class:"mhead"},[h("h3",{text:title}),h("button",{type:"button",class:"ib","aria-label":"Tutup",onclick:closeModal},[ic("x")])]),bodyEl,h("div",{class:"mact"},actions)])]);
 document.body.appendChild(m);var f=m.querySelector("input,textarea,select,button.btn");if(f)f.focus();return m}
function closeModal(){var m=$("#wb-modal");if(m)m.parentNode.removeChild(m)}
document.addEventListener("keydown",function(e){if(e.key==="Escape"){closeModal();toggleCart(false)}});
function field(label,el){return h("label",{class:"fld"},[h("span",{text:label}),el])}
function openForm(id){
 var it=id?find(id):null,v=it||{name:"",desc:"",price:0,category:"",icon:"package",img:""};
 var name=h("input",{type:"text",maxlength:"60",value:v.name,placeholder:"Nama produk"});
 var priceI=h("input",{type:"number",min:"0",step:"500",inputmode:"numeric",value:String(v.price||0),placeholder:"0 = tanya harga"});
 var cat=h("input",{type:"text",maxlength:"24",value:v.category||"",placeholder:"mis. Makanan",list:"wb-catlist"});
 var dl=h("datalist",{id:"wb-catlist"});cats().forEach(function(c){dl.appendChild(h("option",{value:c}))});
 var desc=h("textarea",{rows:"3",maxlength:"140",placeholder:"Deskripsi singkat"});desc.value=v.desc||"";
 var icon=h("select",{});(D.pick||[]).forEach(function(n){var o=h("option",{value:n,text:n});if(n===v.icon)o.selected=true;icon.appendChild(o)});
 var keep=v.img&&!/^https?:/i.test(v.img)?v.img:"";
 var img=h("input",{type:"url",maxlength:"300",value:keep?"":(v.img||""),placeholder:keep?"Gambar unggahan dipakai (isi URL untuk mengganti)":"https://… (opsional)"});
 var err=h("p",{class:"ferr",role:"alert"});
 var body=h("div",{class:"mform"},[field("Nama",name),h("div",{class:"two"},[field("Harga (Rp)",priceI),field("Kategori",cat)]),dl,field("Deskripsi",desc),h("div",{class:"two"},[field("Ikon",icon),field("URL gambar",img)]),err]);
 var save=h("button",{type:"button",class:"btn",onclick:function(){
  var nm=name.value.trim();if(!nm){err.textContent="Nama produk wajib diisi.";name.focus();return}
  var pr=Math.max(0,Math.min(999999999,Math.round(Number(priceI.value)||0)));
  var u=img.value.trim()||keep;if(u&&!okImg(u)){err.textContent="Gambar harus berupa URL http(s) atau gambar bawaan situs.";img.focus();return}
  var rec={id:it?it.id:uid(),name:nm.slice(0,60),desc:desc.value.trim().slice(0,140),price:pr,category:cat.value.trim().slice(0,24),icon:icon.value,img:u,size:it&&it.size?it.size:"small",tag:it&&it.tag?it.tag:""};
  if(it){items[items.indexOf(it)]=rec}else items.push(rec);
  saveItems();closeModal();renderCats();renderGrid();renderCart();toast(it?"Produk diperbarui":"Produk ditambahkan")}},[ic("check"),it?"Simpan":"Tambah"]);
 modal(it?"Ubah produk":"Tambah produk",body,[h("button",{type:"button",class:"btn ghost",onclick:closeModal,text:"Batal"}),save])}
function askDelete(id){var it=find(id);if(!it)return;
 modal("Hapus produk?",h("p",{class:"mtext",text:"\""+it.name+"\" akan dihapus dari katalog."}),[
  h("button",{type:"button",class:"btn ghost",onclick:closeModal,text:"Batal"}),
  h("button",{type:"button",class:"btn danger",onclick:function(){items=items.filter(function(x){return x.id!==id});delete cart[id];saveItems();saveCart();closeModal();renderCats();renderGrid();renderCart();toast("Produk dihapus")}},[ic("trash-2"),"Hapus"])])}
function download(name,text,type){var a=h("a",{href:URL.createObjectURL(new Blob([text],{type:type})),download:name});document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);document.body.removeChild(a)},500)}
function exportJson(){download("produk-"+D.key+".json",JSON.stringify({brand:D.brand,items:items},null,2),"application/json")}
function importJson(){var f=h("input",{type:"file",accept:"application/json,.json"});f.addEventListener("change",function(){var file=f.files&&f.files[0];if(!file)return;var r=new FileReader();r.onload=function(){try{var j=JSON.parse(String(r.result)),arr=Array.isArray(j)?j:j.items;if(!Array.isArray(arr))throw 0;
  var out=[];arr.slice(0,200).forEach(function(x){if(!x||typeof x.name!=="string"||!x.name.trim())return;out.push({id:uid(),name:x.name.trim().slice(0,60),desc:String(x.desc||"").slice(0,140),price:Math.max(0,Math.min(999999999,Math.round(Number(x.price)||0))),category:String(x.category||"").slice(0,24),icon:D.icons[x.icon]?x.icon:"package",img:okImg(x.img)?x.img:"",size:x.size==="large"?"large":"small",tag:String(x.tag||"").slice(0,20)})});
  if(!out.length)throw 0;items=out;cart={};saveItems();saveCart();renderCats();renderGrid();renderCart();toast(out.length+" produk dimuat")}catch(e){toast("File JSON tidak valid.")}};r.readAsText(file)});f.click()}
function exportSite(){
 var doc=document.documentElement.cloneNode(true),d=doc.querySelector("#wb-data");
 try{var cur=JSON.parse(d.textContent);cur.items=items;d.textContent=JSON.stringify(cur).replace(/</g,"\\u003c")}catch(e){}
 [].forEach.call(doc.querySelectorAll("[data-wb-dyn]"),function(n){n.textContent=""});
 [].forEach.call(doc.querySelectorAll("#wb-modal,#wb-adminbar,#wb-toast"),function(n){n.parentNode.removeChild(n)});
 doc.classList.remove("wb-admin");var c=doc.querySelector("#wb-cart");if(c)c.classList.remove("open");
 download("index.html","<!doctype html>\n"+doc.outerHTML,"text/html");toast("index.html terbaru diunduh. Upload ulang untuk memperbarui situs.")}
function resetAll(){modal("Kembalikan ke produk awal?",h("p",{class:"mtext",text:"Semua perubahan produk di browser ini dibuang dan katalog kembali seperti saat situs dibuat."}),[
 h("button",{type:"button",class:"btn ghost",onclick:closeModal,text:"Batal"}),
 h("button",{type:"button",class:"btn danger",onclick:function(){items=D.items.slice();cart={};sdel(KEY+":items");sdel(KEY+":cart");closeModal();renderCats();renderGrid();renderCart();toast("Katalog dikembalikan")}},[ic("rotate-ccw"),"Kembalikan"])])}
function adminBar(){var b=$("#wb-adminbar");if(!b)return;b.textContent="";
 var wrap=h("div",{class:"wrap abar"},[h("span",{class:"alabel"},[ic("pencil"),"Mode kelola"]),
  h("button",{type:"button",class:"btn sm",onclick:function(){openForm()}},[ic("plus"),"Produk baru"]),
  h("button",{type:"button",class:"btn sm ghost",onclick:exportSite},[ic("download"),"Unduh situs"]),
  h("button",{type:"button",class:"btn sm ghost",onclick:exportJson},[ic("save"),"Ekspor JSON"]),
  h("button",{type:"button",class:"btn sm ghost",onclick:importJson},[ic("upload"),"Impor JSON"]),
  h("button",{type:"button",class:"btn sm ghost",onclick:resetAll},[ic("rotate-ccw"),"Reset"]),
  h("button",{type:"button",class:"btn sm ghost",onclick:function(){setAdmin(false)}},[ic("x"),"Selesai"])]);
 b.appendChild(wrap)}

/* ---------- pasang ---------- */
var q=$("#wb-q");if(q)q.addEventListener("input",function(){state.q=q.value;renderGrid()});
var fab=$("#wb-cartbtn");if(fab)fab.addEventListener("click",function(){toggleCart()});
var cc=$("#wb-cartclose");if(cc)cc.addEventListener("click",function(){toggleCart(false)});
var cb=$("#wb-cartback");if(cb)cb.addEventListener("click",function(){toggleCart(false)});
var go=$("#wb-order");if(go)go.addEventListener("click",order);
var ck=$("#wb-clear");if(ck)ck.addEventListener("click",function(){cart={};saveCart();renderCart()});
adminBar();
var preview=location.href==="about:srcdoc";
var wantAdmin=preview||location.hash==="#kelola"||sget(KEY+":admin")==="1";
state.admin=wantAdmin;root.classList.toggle("wb-admin",wantAdmin);
window.addEventListener("hashchange",function(){if(location.hash==="#kelola")setAdmin(true)});
renderCats();renderGrid();renderCart();
})();`;
