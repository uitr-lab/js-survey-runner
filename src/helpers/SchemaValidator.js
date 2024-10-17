import { EventEmitter } from 'events';
import  Schema  from 'async-validator';


/**
 * Automatically validates all fields are not empty
 */
export class SchemaValidator extends EventEmitter {


    constructor(renderer) {
       
         
        // instantiate this before renderering survey/form

        super();
        this._renderer=renderer;

    }

    clearValidationIndicator(field, classList){
        var input = this._renderer.getInput(field);
        input.removeAttribute('data-validation-error');
        if(classList){
            classList.forEach((className)=>{
                input.classList.remove(className);
            });
        }
    }

    setValidationIndicator(field, message, className){
        var input=this._renderer.getInput(field);
        setTimeout(()=>{
            input.setAttribute('data-validation-error', message);
            if(className){
                input.classList.add(className);
            }
        }, 1);
    }

    static SetValidationErrorIndicator(input, error){
        // var input=renderer.getInput(field);
        if(!input){
            return;
        }
        var message=error.message;
        var variable=message.split(' ').shift()
        message=(variable.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\d+$/, '')+" "+(message.split(' ').slice(1).join(' '))).toLowerCase();
        setTimeout(()=>{
            input.setAttribute('data-validation-error', message);
        },1);
        
    }


    requireOneOfValidator(data, container, page){

        if(!data){
            return;
        }
    
        var validationEl=container.appendChild(new Element('span', {"class":"validation"}));

        const validator = new Schema(data);

        this._renderer.addValidator((formData, pageData, opts)=>{

            return validator.validate(pageData).then(()=>{

                // no validation errors. remove all error indicators.

                Object.keys(data).forEach((field)=>{
                    this.clearValidationIndicator(field, ['validation-warning']);
                });


            }).catch(({ errors, fields })=>{

                Object.keys(data).forEach((field)=>{
                    if(Object.keys(fields).indexOf(field)==-1){
                        this.clearValidationIndicator(field, ['validation-warning']);
                    }
                });

                if(Object.keys(fields).length<Object.keys(data).length){

                    // at least one field is valid.
                    Object.keys(data).forEach((field)=>{
                        this.clearValidationIndicator(field);
                    });
                    return true;

                }

                
                var lastFocus=this._renderer.getPreviousTarget();
                var currentFocus=this._renderer.getCurrentTarget();

                Object.keys(fields).forEach((field ,i)=>{


                    var input=this._renderer.getInput(field);
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

                    this.setValidationIndicator(field, errors[i].message, 'validation-warning');
                });

                throw {errors:errors, fields:fields};

            });

        });


    }

    addItemValidator(item, container, page){


        var data=JSON.parse(item.data);
        if(!data){
            return;
        }
    
        var validationEl=container.appendChild(new Element('span', {"class":"validation"}));

        const validator = new Schema(data);

        this._renderer.addValidator((formData, pageData, opts)=>{

            return validator.validate(pageData).then(()=>{

                // no validation errors. remove all error indicators.

                Object.keys(data).forEach((field)=>{
                    this.clearValidationIndicator(field);
                });


            }).catch(({ errors, fields })=>{

                Object.keys(data).forEach((field)=>{
                    if(Object.keys(fields).indexOf(field)==-1){
                        this.clearValidationIndicator(field);
                    }
                });

                
                var lastFocus=this._renderer.getPreviousTarget();
                var currentFocus=this._renderer.getCurrentTarget();

                Object.keys(fields).forEach((field ,i)=>{


                    var input=this._renderer.getInput(field);
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

                    this.setValidationIndicator(field, errors[i].message);
                });

                throw {errors:errors, fields:fields};

            });

        });
    
        
    
    
    }

}