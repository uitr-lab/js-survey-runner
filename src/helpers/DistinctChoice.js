import { EventEmitter } from 'events';



export class DistinctChoice extends EventEmitter {


    constructor(renderer, options) {
       
         
        // instantiate this before renderering survey/form

        super();

        options = options || {};
        options.pages = options.pages || '*';

        renderer.on('renderedNode', function (data, nodeEl) {

            if (!(options.pages === '*' || options.pages.indexOf(data.name) >= 0)) {
                return;
            }

            var allFieldsets = Array.prototype.slice.call(nodeEl.querySelectorAll('input[type="radio"]')).filter(function (el) {
               return el.name.indexOf(options.name)===0;
            });

            allFieldsets.forEach((el)=>{
                el.addEventListener('change', (e)=>{
                    if(el.checked){
                        allFieldsets.forEach((el2)=>{
                            if(el2!==el&&el2.value===el.value&&el2.checked){
                                el2.checked=false;
                                el2.classList.add('unchecked');
                                setTimeout(()=>{
                                    el2.classList.remove('unchecked');
                                   
                                }, 100);
                                var data={};
                                data[el2.name]='';
                                renderer.setPageData(data);
                                renderer.needsUpdate();
                            }
                        })
                    }
                })
            })

        })




    }


}