
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

	addLocalizationsMap(map){

		this._lang='en';
		this._map=map;

	}

	useLocalStorageLocalizationsMap(name){

		var storedData = localStorage.getItem(name);
		if (storedData) {
			storedData=JSON.parse(storedData);
			this.addLocalizationsMap(storedData);
		}

	}


	_setSourceFile(file){
		this._sourceFile=file;
	}

	_setSourceBase(base){
		this._sourceBase=base;
	}


	static addFormatter(name, fn){

		SurveyRenderer._formatters=SurveyRenderer._formatters||{};
		SurveyRenderer._formatters[name]=fn;

	}

	getFormatter(name){
		return (SurveyRenderer._formatters||{})[name]||(()=>{});
	}

	localize(label, from, to){


		from=from||'en';
		to=to||'en';

		if(from===to){
			return label;
		}

		var fromMap=this._map[from||'en'];

		var results=Object.keys(this._map[from||'en']).filter((key)=>{
			return fromMap[key]===label;
		});

		if(results.length){
			var toMap=this._map[to||'fr'];
			if(toMap&&typeof toMap[results[0]]==='string'){
				return toMap[results[0]];
			}
		}


		return label;
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
			this._validate();
		});



		return  this._container;


	}
	_setForwardBtn(btn){
		this._forwardBtns=this._forwardBtns||[];
		this._forwardBtns.push(btn);

		if(this._disableForward){
			btn.disabled=true;
			btn.classList.add('disabled');
		}
	}

	disableForwardNavigation(){

		this._disableForward=true;
		(this._forwardBtns||[]).forEach((btn)=>{
			btn.disabled=true;
			btn.classList.add('disabled');
		});

	}

	enableForwardNavigation(){
		delete this._disableForward;
		(this._forwardBtns||[]).forEach((btn)=>{
			btn.disabled=null;
			btn.classList.remove('disabled');
		});

	}


	addValidator(validator){

		this._validators=this._validators||[];
		this._validators.push(validator);

		//automatically disable forward navigation on add validator
		this.disableForwardNavigation();

	}


	addTransform(transform){


		this._transforms=this._transforms||[];
		this._transforms.push(transform);

	}


	getInput(name){

		var results=Array.prototype.slice.call(this._element.querySelectorAll("*")).filter((el)=>{
			return el.name===name;
		});


		return results[0].parentNode;

	}

	_validate(){

		Promise.all((this._validators||[]).map((validator)=>{

			return new Promise((resolve, reject)=>{

				resolve(validator(this.getFormData(), this.getPageData()));
				
			});

		})).then((results)=>{

			console.log(results);
			this.enableForwardNavigation();


		}).catch((errors)=>{

			console.log(errors);
			this.disableForwardNavigation();

		});

	}

	_update(){

		var formDataObject=new FormData(this._element);
		for (const key of formDataObject.keys()) {
			this._currentFormData()[key]=formDataObject.get(key);
		}	

		(this._transforms||[]).forEach((transform)=>{
			try{
				
				transform();

			}catch(e){
				console.error(e);
			}
		});

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

	_resetContext(){

		this.useFormData(); //reset any loop data offsets
		this._disableForward=false;
		delete this._validators;
		delete this._transforms;

	}

	_renderNode(data, container){

		this._setSourceBase(data.name)

		this._resetContext()

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

							var index=((formData, pageData, renderer)=>{ return eval('(function(){ '+"\n\n"+data.navigationLogic+"\n\n"+' })()')})(this.getFormData(), this.getPageData(), this);

							var handleIndex=(index)=>{

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


								if(index instanceof Promise){
									index.then(handleIndex);
									return;
								}

								this._renderNode(nextNode);

							};

							handleIndex(index);
						}
					}
				});
			}
		});

		this.emit('renderNode');


	}



	_renderSetNavigation(items, i, container, complete){

		this._disableForward=false;
		delete this._validators;
		delete this._transforms;

		container=container||this._element;

		var set=container.appendChild(new Element('div'));

		this._renderSet(items[i], set).then(()=>{


	


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

				
				this._setForwardBtn(complete);
				nav.appendChild(complete);

				return;
			}

			this._setForwardBtn(nav.appendChild(new Element('button', {
				html:"Next",
				events:{
					click:(e)=>{

						this._update();

						e.stopPropagation();
						set.parentNode.removeChild(set);
						this._renderSetNavigation(items, ++i, container, complete);
					}
				}
			})));

		})

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


	unsetFormValue(name){

	
		delete this._formData[name];
		this.emit('update');

	}

	appendFormValue(name, value){

		value=JSON.parse(JSON.stringify(value));
		
		this._currentFormData()[name]=this._currentFormData()[name]||[];
		this._currentFormData()[name].push(value);


		this.emit('update');

	}

	updateFormValue(name, value){

		value=JSON.parse(JSON.stringify(value));

		this._currentFormData()[name]=value;

		this.emit('update');

	}


	updateFormValues(obj){

		obj=JSON.parse(JSON.stringify(obj));


		Object.keys(obj).forEach((name)=>{
			this._currentFormData()[name]=obj[name];
		});

		

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

		if(typeof index!='number'){
			index=0;
		}

		this._useFormData=this._useFormData||this._formData; //copy reference;

		if(!Array.isArray(this._useFormData[key])){
			this._useFormData[key]=[];
		}

		if(typeof this._useFormData[key][index]=='undefined'){
			this._useFormData[key][index]={};
		}

		this._useFormData=this._useFormData[key][index];

		


	}


	getSourceUrl(){


		var path=(this._sourceBase||"page")+"/"+(this._sourceFile)+".js?"
		path=path.split(' ').join('');

		return '//# sourceURL=survey-runner://survey-items/scripts/'+path

	}

	_renderSet(data, container){


		container=container||this._element;

		if(this._displayInfo){
			container.appendChild(new Element('h2',{
					"class":'set-label',
					html:data.name
				}));
		}

		return this.renderItems(data.items, container).then(()=>{


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

		});


	}

	renderItems(items, container){


		var list=items.slice(0);


		if(list.length>0){


			// var resp=this._renderItem(list.shift(), container);

			// var promise=Promise.resolve();
			// if(resp instanceof Promise){
			// 	promise=resp;
			// }

			return new Promise((resolve)=>{

				resolve(this._renderItem(list.shift(), container));

			}).then(()=>{

				return this.renderItems(list, container);

			});


		}

		return Promise.resolve();

		items.forEach((item)=>{

			

		});



	}

	withVariables(vars, cb){

		var original={}
		Object.keys(vars).forEach((k)=>{
			original[k]=this._formData[k];
			this._formData[k]=vars[k];
		});

		cb();

		Object.keys(vars).forEach((k)=>{
			if(typeof original[k]=='undefined'){
				delete this._formData[k];
				return;
			}
			this._formData[k]=original[k];
		});


	}

	renderItem(item, container){
		return this._renderItem(item, container);
	}

	_renderItem(item, container){



		container=container||this._element;

		if(typeof SurveyRenderer._renderers[item.type]=='function'){
			try{

				this._setSourceFile(item.type);
				return SurveyRenderer._renderers[item.type](item, container, this);
			}catch(e){
				console.error(e);
				this.appendFormValue('errors', e.message);
			}
			return;

		}

		throw 'Type not defined: '+item.type


	}

}


window.SurveyRenderer = SurveyRenderer;
