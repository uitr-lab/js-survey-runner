
import {
	Element
} from './Element.js'

import {
	EventEmitter
} from 'events';



export class SurveyRenderer extends EventEmitter{


	static _renderers={}


	constructor(){
		super();

		this.on('renderPage',()=>{
			setTimeout(()=>{
				this._container.scrollTo(0,0);
				if(this._container.parentNode){
					this._container.parentNode.scrollTo(0,0);
				}
			}, 100);
			
		})

	}


	displayInfo(){
		this._displayInfo=true;
		return this;
	}


	static addItem(type, renderer){

		SurveyRenderer._renderers[type]=renderer;


	}

	render(data){


		this._data=data;

		this._formData={}

		this._container=new Element('div');


		var form= this._container.appendChild(new Element('form', {
			"class":"survey-view"
		}));

		this._element=form;


		if(this._displayInfo){

			this._dataPreview=this._container.appendChild(new Element('pre',{
			    "class":"survey-data",
				html:JSON.stringify(this._formData, null, '   ')
			}))

			this.on('update',()=>{
				this._dataPreview.innerHTML=JSON.stringify(this._formData, null, '   ');
			})

		}

		if(data.type=='set'&&data.items){
			form.classList.add('set-view');
			this._renderSet(data);

		}




		if(data.type=='section'&&data.items){

			this._renderNode(data);
		}


		

		form.addEventListener('change', ()=>{
			this._update();
		});



		return  this._container;


	}

	_update(){

		var formDataObject=new FormData(this._element);
		for (const key of formDataObject.keys()) {
			this._currentFormData()[key]=formDataObject.get(key);
		}	
		this.emit('update');

	}

	_findNode(uuid, data){

		data=data||this._data;
		if(data.uuid===uuid){
			return data;
		}

		if(!(data.nodes&&data.nodes.length>0)){
			return null;
		}

		var matches=data.nodes.map((node)=>{
			return this._findNode(uuid, node);
		}).filter((node)=>{
			return !!node;
		});

		if(matches.length==0){
			return null;
		}

		return matches[0];
	}

	_findNextNodePrefix(uuid, data){
		var matches=data.nodes.filter((node)=>{
			return node.uuid===uuid;
		})

		if(matches.length==0){
			matches=data.nodes.filter((node)=>{
				return (node.uuid||node).indexOf(uuid)===0;
			});
		}

		if(matches.length==0){
			return null;
		}

		var match=matches[0];
		if(typeof match=='string'){
			return this._findNode(match);
		}

		return match;
	}

	_renderNode(data, container){

		this.useFormData(); //reset any loop data offsets

		container=container||this._element;

		var node=container.appendChild(new Element('main'));

		if(this._displayInfo){

			node.appendChild(new Element('h1',{
				"class":'node-label',
				html:data.name
			}));
		}
		
		this._renderSetNavigation(data.items , 0, node, (set)=>{

			if(data.nodes&&data.nodes.length){

				return new Element('button', {
					html:"Next",
					events:{
						click:(e)=>{

							this._update();

							e.stopPropagation();
							node.parentNode.removeChild(node);

							
							var nextNode=data.nodes[0];

							var index=((formData, pageData, renderer)=>{ return eval('(function(){ '+data.navigationLogic+' })()')})(this.getFormData(), this.getPageData(), this);

							if(typeof index =='number'){
								index=parseInt(index);
								nextNode=data.nodes[index];
							}

							if(typeof index=='string'){

								nextNode=this._findNextNodePrefix(index, data)||this._findNode(index);
								//throw 'Not implemented: Navigation to node uuid';
							}

							if(typeof nextNode=='string'){
								nextNode=this._findNode(nextNode);
								//throw 'Not implemented: Navigation to node uuid';
							}

							this._renderNode(nextNode);
						}
					}
				});
			}
		});

		this.emit('renderNode');


	}



	_renderSetNavigation(items, i, container, complete){

		container=container||this._element;

		var set=container.appendChild(new Element('div'));

		this._renderSet(items[i], set);



		var nav=set.appendChild(new Element('nav'));


		if(i>0){

			nav.appendChild(new Element('button', {
				html:"Back",
				events:{
					click:(e)=>{

						this._update();

						e.stopPropagation();
						set.parentNode.removeChild(set);
						this._renderSetNavigation(items, --i, container, complete);
					}
				}
			}))
		}

		if(i==items.length-1){

			if(typeof complete==='function'){
				complete=complete();
			}

			complete=complete||new Element('button', {
				html:"Complete",
				events:{
					click:(e)=>{

						this._update();

						e.stopPropagation();
						set.parentNode.removeChild(set);
						this.emit('complete');
						container.appendChild(new Element('h3', {
							html:"Complete!"
						}))
					}
				}
			});

			

			nav.appendChild(complete);

			return;
		}

		nav.appendChild(new Element('button', {
			html:"Next",
			events:{
				click:(e)=>{

					this._update();

					e.stopPropagation();
					set.parentNode.removeChild(set);
					this._renderSetNavigation(items, ++i, container, complete);
				}
			}
		}))

	}

	/**
	 * returns the entire data object containing all data collected by forms and pages so far
	 * use getData if possible as it returns the data in the context of the current page (which may be the same data 
	 * as returned by this method)
	 */
	getFormData(){
		return JSON.parse(JSON.stringify(this._formData));
	}


	/**
	 * For forms with nested pages and loops, this method will return the data in the
	 * context of the current page.
	 */
	getPageData(){

		return JSON.parse(JSON.stringify(this._currentFormData()));

	}


	getFormValue(name){

		return this.getFormData()[name];

	}


	setFormValue(name, value){

		value=JSON.parse(JSON.stringify(value));

		this._formData[name]=value;

		this.emit('update');

	}

	updateFormValue(name, value){

		value=JSON.parse(JSON.stringify(value));

		this._currentFormData()[name]=value;

		this.emit('update');

	}

	setFormData(obj){

		obj=JSON.parse(JSON.stringify(obj));
		Object.keys(obj).forEach((key)=>{
			this._formData[key]=obj[key];
		})

		this.emit('update');

	}


	/**
	 * return a reference to the current form data object. 
	 * this is used to store form field values on form updates.
	 *
	 * This object may not reference the root formData object for example when iterating a loop, 
	 * it's reference me be set to an item in an array of values
	 */
	_currentFormData(){

		if(this._useFormData){
			return this._useFormData;
		}

		return this._formData;
	}

	useFormData(){
		delete this._useFormData;
	}
	useFormDataFieldArray(key, index){

		this._useFormData=this._useFormData||this._formData; //copy reference;

		if(!Array.isArray(this._useFormData[key])){
			this._useFormData[key]=[];
		}

		if(typeof this._useFormData[key][index]=='undefined'){
			this._useFormData[key][index]={};
		}

		this._useFormData=this._useFormData[key][index];

		


	}

	_renderSet(data, container){


		container=container||this._element;

		if(this._displayInfo){
			container.appendChild(new Element('h2',{
					"class":'set-label',
					html:data.name
				}));
		}

		data.items.forEach((item)=>{

			this._renderItem(item, container);

		});


		Array.prototype.slice.call(this._element.querySelectorAll("*")).forEach((el)=>{

			if(typeof el.name=='string'&&typeof this._currentFormData()[el.name]!='undefined'){

				if(el.type==='checkbox'){
					el.checked=this._currentFormData()[el.name]==='on';
					return;
				}

				el.value=this._currentFormData()[el.name];
			}
			
		});

		this._update();
		this.emit('renderSet');
		this.emit('renderPage'); 


	}

	renderItem(item, container){
		this._renderItem(item, container);
	}

	_renderItem(item, container){



		container=container||this._element;

		if(typeof SurveyRenderer._renderers[item.type]=='function'){

			SurveyRenderer._renderers[item.type](item, container, this);
			return;

		}

		throw 'Type not defined: '+item.type


	}

}


window.SurveyRenderer = SurveyRenderer;
