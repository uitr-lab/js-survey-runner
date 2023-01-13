
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


		this._dataPreview=this._container.appendChild(new Element('pre',{
		    "class":"survey-data",
			html:JSON.stringify(this._formData, null, '   ')
		}))

		this.on('update',()=>{
			this._dataPreview.innerHTML=JSON.stringify(this._formData, null, '   ');
		})

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
			this._formData[key]=formDataObject.get(key);
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

	_renderNode(data, container){

		container=container||this._element;

		var node=container.appendChild(new Element('main'));

		node.appendChild(new Element('h1',{
			"class":'node-label',
			html:data.name
		}));
		
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

							var index=(()=>{ return eval('(function(){ '+data.navigationLogic+' })()')})();

							if(typeof index =='number'){
								index=parseInt(index);
								nextNode=data.nodes[index];
							}

							if(typeof index=='string'){
								nextNode=this._findNode(index);
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

	getFormData(){
		return JSON.parse(JSON.stringify(this._formData));
	}


	setFormValue(name, value){

		value=JSON.parse(JSON.stringify(value));

		this._formData[name]=value;

	}

	setFormData(obj){

		obj=JSON.parse(JSON.stringify(obj));
		Object.keys(obj).forEach((key)=>{
			this._formData[key]=obj[key];
		})

		this.emit('update');

	}


	_renderSet(data, container){


		container=container||this._element;

		container.appendChild(new Element('h2',{
				"class":'set-label',
				html:data.name
			}));

		data.items.forEach((item)=>{

			this._renderItem(item, container);

		});


		Array.prototype.slice.call(this._element.querySelectorAll("*")).forEach((el)=>{

			if(typeof el.name=='string'&&typeof this._formData[el.name]!='undefined'){
				el.value=this._formData[el.name];
			}
			
		});





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
