import { EventEmitter } from 'events';

import {
    Element
} from '../Element.js'


export class FieldsetNavigation extends EventEmitter {


    constructor(renderer, options) {
        
        // instantiate this before renderering survey/form

        super();

        options = options || {};
        options.pages = options.pages || '*';
        if(typeof options.showBack !="boolean"){
            options.showBack=true;
        }


        this.on('navigation',()=>{

            renderer.scrollToTop();

        });

        renderer.on('renderedNode',  (data, nodeEl) => {

            if (!(options.pages === '*' || options.pages.indexOf(data.name) >= 0)) {
                return;
            }


            var defaultGetFieldsets=()=>{

                var allFieldsets = Array.prototype.slice.call(nodeEl.querySelector('fieldset').parentNode.childNodes).filter( (el) => {
                    return el.tagName.toLowerCase() == 'fieldset' || el.classList.contains('fieldset');
                });

                return allFieldsets;
            }

            

            var getFieldsets=()=>{

                if(options.getFieldsets){
                    /*
                    * Caller can define method to get fieldsets
                    */
                    var fieldsets = options.getFieldsets(data, nodeEl, defaultGetFieldsets);
                }else{
                    var fieldsets =  defaultGetFieldsets();
                }

                fieldsets.forEach((fieldset)=>{
                    fieldset.classList.add('fieldset-nav-target');
                });

                return fieldsets;

            }

            var allFieldsets=getFieldsets();
            


            var i = 0;

            while (i<allFieldsets.length&&window.getComputedStyle(allFieldsets[i]).display === "none") {
                i++;
            }

            allFieldsets[i].classList.add('first-focus');
            allFieldsets[i].classList.add('focus');

            if(options.showBack){
                var backBtn=nodeEl.querySelector('nav').appendChild(new SurveyRenderer.Element('button', {
                    html: "Back",
                    "class": "focus-back",
                    events: {
                        click:  (e) => {

                            e.stopPropagation();
                            e.preventDefault();

                            allFieldsets[i].classList.remove('focus');
                            i--;

                            // child list may change
                            allFieldsets = getFieldsets();

                            while (i>=0&&window.getComputedStyle(allFieldsets[i]).display === "none") {
                                i--;
                            }

                            if(i<0){
                                //currently viewing the first section/fieldset
                                renderer.back();
                                return;
                            }

                            allFieldsets[i].classList.add('focus');
                            renderer.needsUpdateValidation();
                            
                            this.emit('navigation');

                        }
                    }
                }));
            }


            var forwardBtn=nodeEl.querySelector('nav').appendChild(new SurveyRenderer.Element('button', {
                html: "Next",
                "class": "focus-next",
                events: {
                    click:  (e) => {

                        e.stopPropagation();
                        e.preventDefault();

                        allFieldsets[i].classList.remove('focus');
                        i++;

                        // child list may change
                        allFieldsets = getFieldsets();

                        while (i<allFieldsets.length&&window.getComputedStyle(allFieldsets[i]).display === "none") {
                            i++;
                        }

                        if(i>=allFieldsets.length){
                            // there is no remaining section becuase the last section is not displayed;
                            renderer.next();
                            return;
                        }

                        allFieldsets[i].classList.add('focus');
                        renderer.needsUpdateValidation();

                        this.emit('navigation');

                    }
                }
            }));



            renderer.on('validation',()=>{

                forwardBtn.disabled = null;
                forwardBtn.classList.remove('disabled');

            });

            renderer.on('failedValidation',()=>{

                forwardBtn.disabled = true;
			    forwardBtn.classList.add('disabled');
                
            })

        });




        







    }


}