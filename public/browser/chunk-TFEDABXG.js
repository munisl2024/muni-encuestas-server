import{m as z,p as D}from"./chunk-UHNCRVEK.js";import{$ as I,Bb as g,Db as w,Jb as O,Ka as k,Na as S,Pa as T,Ua as a,Va as y,Ya as h,cb as s,ea as m,fa as d,ga as x,ha as b,hb as p,kb as o,lb as l,mb as f,pb as v,ub as c,vb as r,wb as V,xa as M,xb as E}from"./chunk-GYUG5PKY.js";function P(e,u){if(e&1&&(o(0,"div",18),f(1,"img",19),l()),e&2){let t=r(2);a(1),s("src",t.urlIcono,k)}}function F(e,u){if(e&1){let t=v();o(0,"button",20),c("click",function(){m(t);let i=r(2);return d(i.imprimirItem())}),f(1,"img",21),l()}}function Y(e,u){if(e&1){let t=v();o(0,"button",22),c("click",function(){m(t);let i=r(2);return d(i.eliminarItem())}),x(),o(1,"svg",23),f(2,"path",24),l()()}}function j(e,u){if(e&1){let t=v();o(0,"button",29),c("click",function(){m(t);let i=r(3);return d(i.crearItem())}),g(1),l()}if(e&2){let t=r(3);a(1),w(" ",t.textoCrear," ")}}function L(e,u){if(e&1){let t=v();o(0,"button",30),c("click",function(){m(t);let i=r(3);return d(i.actualizarItem())}),g(1),l()}if(e&2){let t=r(3);a(1),w(" ",t.textoActualizar," ")}}function H(e,u){if(e&1){let t=v();x(),b(),o(0,"div",25)(1,"button",26),c("click",function(){m(t);let i=r(2);return d(i.cerrarModal())}),g(2," Cancelar "),l(),p(3,j,2,1,"button",27)(4,L,2,1,"button",28),l()}if(e&2){let t=r(2);a(3),s("ngIf",t.estadoFormulario=="crear"),a(1),s("ngIf",t.estadoFormulario=="editar")}}function B(e,u){e&1&&f(0,"div",31)}function A(e,u){if(e&1){let t=v();o(0,"div",1),f(1,"div",2),o(2,"div",3)(3,"div",4)(4,"div")(5,"div",5),c("mousedown",function(i){m(t);let _=r();return d(_.onMouseDown(i))}),o(6,"div",6),p(7,P,2,1,"div",7),o(8,"h1",8),g(9),l()(),o(10,"div"),p(11,F,2,0,"button",9)(12,Y,3,0,"button",10),o(13,"button",11),c("click",function(){m(t);let i=r();return d(i.cerrarModal())}),x(),o(14,"svg",12),f(15,"line",13)(16,"line",14),l()()()(),E(17),p(18,H,5,2,"div",15),l()()(),b(),o(19,"div",16),p(20,B,1,0,"div",17),l()()}if(e&2){let t=r();a(7),s("ngIf",t.urlIcono),a(2),w(" ",t.titulo," "),a(2),s("ngIf",t.showImprimir),a(1),s("ngIf",t.showEliminar),a(6),s("ngIf",t.showFooter),a(2),s("ngIf",t.showModal)}}var U=["*"],W=(()=>{class e{constructor(t,n){this.el=t,this.renderer=n,this.showModal=!1,this.titulo="Titulo de modal",this.urlIcono="",this.estadoFormulario="crear",this.textoCrear="Crear",this.textoActualizar="Actualizar",this.showFooter=!0,this.showEliminar=!1,this.showImprimir=!1,this.closeModal=new h,this.crear=new h,this.actualizar=new h,this.eliminar=new h,this.imprimir=new h,this.isDragging=!1,this.startX=0,this.startY=0,this.initialLeft=0,this.initialTop=0}ngOnInit(){}onMouseMove(t){if(this.isDragging){let n=t.clientX-this.startX,i=t.clientY-this.startY,_=this.el.nativeElement.querySelector(".modal-content");_&&(this.renderer.setStyle(_,"left",`${this.initialLeft+n}px`),this.renderer.setStyle(_,"top",`${this.initialTop+i}px`))}}onMouseUp(t){this.isDragging=!1}onMouseDown(t){this.isDragging=!0,this.startX=t.clientX,this.startY=t.clientY;let n=this.el.nativeElement.querySelector(".modal-content");n&&(this.initialLeft=n.offsetLeft,this.initialTop=n.offsetTop)}imprimirItem(){this.imprimir.emit()}cerrarModal(){this.closeModal.emit()}crearItem(){this.crear.emit()}actualizarItem(){this.actualizar.emit()}eliminarItem(){this.eliminar.emit()}static{this.\u0275fac=function(n){return new(n||e)(y(S),y(T))}}static{this.\u0275cmp=I({type:e,selectors:[["app-modal"]],hostBindings:function(n,i){n&1&&c("mousemove",function(C){return i.onMouseMove(C)},!1,M)("mouseup",function(C){return i.onMouseUp(C)},!1,M)},inputs:{showModal:"showModal",titulo:"titulo",urlIcono:"urlIcono",estadoFormulario:"estadoFormulario",textoCrear:"textoCrear",textoActualizar:"textoActualizar",showFooter:"showFooter",showEliminar:"showEliminar",showImprimir:"showImprimir"},outputs:{closeModal:"closeModal",crear:"crear",actualizar:"actualizar",eliminar:"eliminar",imprimir:"imprimir"},standalone:!0,features:[O],ngContentSelectors:U,decls:1,vars:1,consts:[["class","z-20 absolute w-11/12 mt-10",4,"ngIf"],[1,"z-20","absolute","w-11/12","mt-10"],[1,"flex","items-center","justify-center","absolute","top-0","left-200","w-11/12"],["name","custom","enter-active-class","animate__animated animate__bounceInDown","leave-active-class","animate__animated animate__bounceOutUp",1,"flex","items-center","justify-center"],[1,"modal-content","animate__animated","animate__slideInUp","animate__faster","w-11/12","left-4","md:left-auto","top-10","md:top-24","lg:w-full","max-w-xl","mx-auto","bg-white","fixed","z-20","flex","flex-col","self-center","shadow-2xl","rounded-md"],[1,"header-formulario",3,"mousedown"],[1,"flex","items-center"],["class","icono-formulario",4,"ngIf"],[1,"titulo-formulario","text-lg","md:text-xl"],["class","bg-white/10 hover:bg-white/20 text-white p-2.5 mr-3 rounded-lg transition-colors duration-200","title","Imprimir comprobante",3,"click",4,"ngIf"],["title","Eliminar","class","bg-red-500 hover:bg-red-600 mr-3 text-white p-2.5 rounded-lg transition-colors duration-200",3,"click",4,"ngIf"],[1,"bg-white/10","hover:bg-white/20","text-white","p-2.5","rounded-lg","transition-colors","duration-200",3,"click"],["width","22","height","22","viewBox","0 0 24 24","fill","none","stroke","currentColor","stroke-width","2","stroke-linecap","round","stroke-linejoin","round"],["x1","18","y1","6","x2","6","y2","18"],["x1","6","y1","6","x2","18","y2","18"],["class","bg-gray-50 px-6 py-4 rounded-b flex justify-end",4,"ngIf"],["name","custom","enter-active-class","animate__animated animate__fadeIn","leave-active-class","animate__animated animate__fadeOut"],["class","bg-gray-700 bg-opacity-50 fixed bottom-0 left-0 w-full h-full transition duration-500 ease-in-out transfom",4,"ngIf"],[1,"icono-formulario"],[1,"w-8","h-8",3,"src"],["title","Imprimir comprobante",1,"bg-white/10","hover:bg-white/20","text-white","p-2.5","mr-3","rounded-lg","transition-colors","duration-200",3,"click"],["src","assets/svg/iconos/imprimir.svg",1,"w-6","h-6","min-w-6","min-h-6"],["title","Eliminar",1,"bg-red-500","hover:bg-red-600","mr-3","text-white","p-2.5","rounded-lg","transition-colors","duration-200",3,"click"],["xmlns","http://www.w3.org/2000/svg","fill","none","viewBox","0 0 24 24","stroke-width","1.5","stroke","currentColor",1,"w-5","h-5"],["stroke-linecap","round","stroke-linejoin","round","d","m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"],[1,"bg-gray-50","px-6","py-4","rounded-b","flex","justify-end"],[1,"boton-formulario-cancelar",3,"click"],["class","boton-formulario-crear ml-3",3,"click",4,"ngIf"],["class","boton-formulario-editar ml-3",3,"click",4,"ngIf"],[1,"boton-formulario-crear","ml-3",3,"click"],[1,"boton-formulario-editar","ml-3",3,"click"],[1,"bg-gray-700","bg-opacity-50","fixed","bottom-0","left-0","w-full","h-full","transition","duration-500","ease-in-out","transfom"]],template:function(n,i){n&1&&(V(),p(0,A,21,6,"div",0)),n&2&&s("ngIf",i.showModal)},dependencies:[D,z],styles:[`.modal-enter[_ngcontent-%COMP%] {
      opacity: 0;
      transform: translateY(-60px);
    }
  
    .modal-enter-active[_ngcontent-%COMP%] {
      opacity: 1;
      transform: translateY(0);
      transition: all 0.3s ease-out;
    }
  
    .modal-leave[_ngcontent-%COMP%] {
      opacity: 1;
      transform: translateY(0);
    }
  
    .modal-leave-active[_ngcontent-%COMP%] {
      opacity: 0;
      transform: translateY(-60px);
      transition: all 0.3s ease-in;
    }
  
    .overlay-enter[_ngcontent-%COMP%] {
      opacity: 0;
    }
  
    .overlay-enter-active[_ngcontent-%COMP%] {
      opacity: 1;
      transition: opacity 0.3s ease-out;
    }
  
    .overlay-leave[_ngcontent-%COMP%] {
      opacity: 1;
    }
  
    .overlay-leave-active[_ngcontent-%COMP%] {
      opacity: 0;
      transition: opacity 0.3s ease-in;
    }
  
    .modal-content[_ngcontent-%COMP%] {
      animation: _ngcontent-%COMP%_slideIn 0.4s ease-out forwards;
    }
  
    @keyframes _ngcontent-%COMP%_slideIn {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
  
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  
    .modal-content[_ngcontent-%COMP%]:hover {
      transform: scale(1.01);
      transition: transform 0.2s ease;
    }`],changeDetection:0})}}return e})();export{W as a};
