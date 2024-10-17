import { EventEmitter } from 'events';
import  Schema  from 'async-validator';
import  { SchemaValidator }  from './SchemaValidator.js';

/**
 * Automatically validates all fields are not empty
 */
export class AutoValidator extends EventEmitter {


    constructor(renderer, options) {
       
         
        // instantiate this before renderering survey/form

        super();

        this._renderer=renderer;

        this._lastErrorSet=null;

        this._renderer.on('renderPage', ()=>{

            renderer.addValidator((formData, pageData, opts)=>{

                var data={};
                var keys=Object.keys(pageData).filter((k)=>{
                    var input=renderer.getInput(k);
                    return typeof pageData[k]=='string'&&input&&(!this._isHidden(input));
                });

                if(keys.length==0){
                    return Promise.resolve();
                }

                keys.forEach((k)=>{

                    if(options.optionalFields){
                        if(options.optionalFields.filter((optional)=>{
                            if(k===optional){
                                return true;
                            }

                            if(optional[optional.length-1]==='*'){
                                if(k.indexOf(optional.substring(0, optional.length-1))===0){
                                    return true;
                                }
                            }

                            return false;

                        }).length>0){
                            return;
                        }
                    }

                    data[k]={
                        type:"string",
                        required:true
                    }
                })

                

                const validator = new Schema(data);

                return validator.validate(pageData).then(()=>{
    
                    Object.keys(data).forEach((field)=>{
                        renderer.getInput(field).removeAttribute('data-validation-error');
                    });
    
                    this._lastErrorSet=null;
    
                }).catch(({ errors, fields })=>{

                    this._lastErrorSet=[errors, fields];
    
                    Object.keys(data).forEach((field)=>{
                        if(Object.keys(fields).indexOf(field)==-1){
                            var input=renderer.getInput(field);
                            if(input){
                                input.removeAttribute('data-validation-error');
                            }   
                            return;
                        }
                    });
                    
                    var lastFocus=renderer.getPreviousTarget();
                    var currentFocus=renderer.getCurrentTarget();
    
                    Object.keys(fields).forEach((field ,i)=>{
    
    
                        var input=renderer.getInput(field);
                        if(!input){
                            return;
                        }
                        if(currentFocus){
                            if(currentFocus.compareDocumentPosition(input)===4){
                                /**
                                 * for all inputs after the current target do not add error indicators
                                 */
                                return;
                            }
                        }
    
                        if(opts.showNewWarnings===false){
                            return;
                        }

                        SchemaValidator.SetValidationErrorIndicator(input, errors[i]);
                    });
    
                    throw {errors:errors, fields:fields};
    
                });
    
            })


        });
 

    }

    showErrors(){
        if(this._lastErrorSet){

            var renderer=this._renderer;
            
            var errors=this._lastErrorSet[0];
            var fields=this._lastErrorSet[1];

            Object.keys(fields).forEach((field ,i)=>{
    
                var input=renderer.getInput(field);
                if(!input){
                    return;
                }

                SchemaValidator.SetValidationErrorIndicator(input, errors[i])

            });
        }
    }


    _isHidden(el){
        if(el==document.body){
            return false;
        }

        if(window.getComputedStyle(el).display==='none'){
            return true;
        }

        return this._isHidden(el.parentNode);

    }

}