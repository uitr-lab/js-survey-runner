import {
	EventEmitter
} from 'events';

import {
	Element
} from '../Element.js'

import  Schema  from 'async-validator';
import  { SchemaValidator }  from './SchemaValidator.js';

export class ListRender extends EventEmitter {

	constructor(page) {

		super();

		this._page = page


		this._previousItems = [];
		this._nextItems = [];
		this._currentItem = null;
		this._autoIndex = 0;



		this._page.on('update', () => {
			this._throttleUpdate();
		});


		this._isValidated=true;
		this._lastErrorSet=null;

	}

	getPage(){
		return this._page;
	}

	getRenderer(){
		return this._page.getRenderer();
	}

	_isHidden(el){
		
		if(this.getItems().indexOf(el)>=0){
			return false;
		}

		if(el.style.display==='none'){
			return true;
		}

		return this._isHidden(el.parentNode);

	
	}

	autoValidate(){

		this._isValidated=false;

		var renderer=this._page.getRenderer();
		this._page.addValidator((formData, pageData, opts, sharedErrors, sharedResults)=>{

			var data={};
			var contextData = this._page.getContextData();
			 this.getItems().forEach((el) => {
				this._getItemDataInputs(el, contextData).forEach((input)=>{

					if(this._isHidden(input)){
						return;
					}

					data[input.name]={
						type:"string",
						required:true
					}
				})
			});

			

			const validator = new Schema(data);

			return validator.validate(pageData).then(()=>{

				if(this._validationErrors&&Object.keys(this._validationErrors).length>0){
					throw this._validationErrors[Object.keys(this._validationErrors)[0]]; //throw the first one.!
				}

				Object.keys(data).forEach((field)=>{
					this._page.getInput(field).removeAttribute('data-validation-error');
				});

				this._isValidated=true;
				this._lastErrorSet=null;

				this.emit('validation');

				

			}).catch(({ errors, fields })=>{


				if(this._validationErrors){
					Object.keys(this._validationErrors).forEach((name)=>{
						var errorFields=Object.keys(this._validationErrors[name].fields);
						errorFields.forEach((field, i)=>{
							if(typeof fields[field]=="undefined"){
								errors.push(this._validationErrors[name].errors[i])
								fields[field]=this._validationErrors[name].fields[field]
							}
						});
						
					});
				}

				this._lastErrorSet=[errors, fields];

				Object.keys(data).forEach((field)=>{
					if(Object.keys(fields).indexOf(field)==-1){
						var input=this._page.getInput(field);
						if(input){
							input.removeAttribute('data-validation-error');
						}   
						return;
					}
				});
				
				var lastFocus=renderer.getPreviousTarget();
				var currentFocus=renderer.getCurrentTarget();

				Object.keys(fields).forEach((field ,i)=>{

					

					var input=this._page.getInput(field);
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

					if(opts.showNewWarnings===false && ((!errors[i].forceDisplay)||errors[i].forceDisplay!==true)){
						return;
					}

					SchemaValidator.SetValidationErrorIndicator(input, errors[i]);
				});

				var errors = {errors:errors, fields:fields};

				this._isValidated=false;
				this.emit('failedValidation', errors);

				throw errors;

			});

		});


		this.on('validation',()=>{
			if(this._addButton){
				this._addButton.classList.remove('disabled');
			}
		})

		this.on('failedValidation',()=>{
			if(this._addButton){
				this._addButton.classList.add('disabled');
			}
		})

	}

	addValidationErrors(name, errors){
		if(!this._validationErrors){
			this._validationErrors={};
		}
		this._validationErrors[name]=errors;
	}
    removeValidationErrors(name){
		if(!this._validationErrors){
			return;
		}
		delete this._validationErrors[name];
	}
	

	showErrors(){
        if(this._lastErrorSet){

			this._pulseErrors();

            var renderer=this.getRenderer();
            
            var errors=this._lastErrorSet[0];
            var fields=this._lastErrorSet[1];

            Object.keys(fields).forEach((field ,i)=>{
    
                var input=renderer.getInput(field);
                if(!input){
                    return;
                }

				SchemaValidator.SetValidationErrorIndicator(input, errors[i]);
                
            });
        }
    }

	isIndexValid(index){
		if(this.isValid()){
			return true;
		}
		var keys=Object.keys(this._lastErrorSet[1]);
		var field;
		for(var i=0;i<keys.length;i++){
			field=keys[i];
			var match = field.match(/\d+$/);
			if (match&&match[0]+""===index+"") {
				return false;
			} 
		}

		return true;

	}

	_pulseErrors(){
	
		this.getElement().classList.add('pulse-errors');
		if(this._pulseTimeout){
			return;
		}
		this._pulseTimeout=setTimeout(()=>{
			delete this._pulseTimeout;
			this.getElement().classList.remove('pulse-errors');
		}, 500)

	}

	isValid(){
		return this._isValidated;
	}

	needsUpdate() {
		this._page.needsUpdate();
		this._page.getRenderer().needsUpdateValidation();
	}

	_throttleUpdate() {

		if (this._updateTimeout) {
			clearTimeout(this._updateTimeout);
		}

		this._updateTimeout = setTimeout(() => {
			this._updateTimeout = null;
			this._update();

		}, 150);



	}
	_update() {
		if (this._currentItem) {


			var dataset = this._getDataItem(this._currentItem);
			var datasetKeys=Object.keys(dataset);

			Object.keys(this._currentItem.dataset).forEach((key) => {
				if(key=='index'){
					return;
				}
				if(datasetKeys.indexOf(key)>=0){
					delete this._currentItem.dataset[key];
				}
			});

			

			Object.keys(dataset).forEach((key) => {
				this._currentItem.dataset[key] = dataset[key];
			});

			this.emit('update');
		}

	}

	setDatasetKeyFormatter(fn) {
		this._datasetKeyFmt = fn;
		return this;
	}

	setDatasetFormatter(fn) {
		this._datasetFmt = fn;
		return this;
	}

	getElement() {
		this._wrap = this._wrap || new Element('div', {
			"class": "list-render"
		});
		return this._wrap;
	}

	_getDataItem(itemEl, data) {


		var dataRaw=this._getItemDataRaw(itemEl, data);
		var dataset={};
		Object.keys(dataRaw).forEach((name)=>{
			var key = name;
			if (this._datasetKeyFmt) {
				key = this._datasetKeyFmt(key);
			}
			dataset[key] = dataRaw[name];

		});

		if (this._datasetFmt) {
			dataset = this._datasetFmt(dataset);
		}

		return dataset;

	}
	_getItemDataInputs(itemEl, data){

		data = data || this._page.getContextData();
		
		return Array.prototype.slice.call(itemEl.querySelectorAll("*")).filter((el) => {

			if (el.name) {
				if (typeof data[el.name] != 'undefined') {
					return true;
				}
			}
			return false;

		});

	}

	_getItemDataRaw(itemEl, data) {

		var dataset = {};
		this._getItemDataInputs(itemEl, data).forEach((el) => {
			dataset[el.name] = el.value;
		});

		return dataset;

	}



	getItems() {
		return this._previousItems.concat([this._currentItem], this._nextItems).filter((el) => {
			return !!el;
		});
	}

	getItemsData() {

		var data = this._page.getContextData();

		return this.getItems().map((el) => {
			return this._getDataItem(el, data);
		});

	}

	getItemElement(index) {

		return this.getItems()[index];

	}

	getItemInput(index, name) {

		var itemEl = this.getItems()[index];

		var results = Array.prototype.slice.call(itemEl.querySelectorAll("*")).filter((el) => {

			if (el.name) {

				if (el.name === name) {
					return true;
				}

				var key = el.name;
				if (this._datasetKeyFmt) {
					key = this._datasetKeyFmt(key);
				}
				if (key === name) {
					return true;
				}
			}


			return false;

		});

		return results.length > 0 ? results[0] : null;

	}

	renderList(defaultRenderFn, container, opt) {


		this._defaultRenderFn = defaultRenderFn;

		opt = opt || {};
		this.options=opt;


		this._wrap = container.appendChild(this.getElement());


		var i=1;
		var data=this._page.getContextData();
		var addInitialItems=(el)=>{

			var inputs=Array.prototype.slice.call(el.querySelectorAll("input, textarea"));
			var name=inputs[0].name.replace(/\d+$/, "");
			
			
			if(typeof data[name+i]!='undefined'){
				i++;
				this._addItem(addInitialItems);
			}

		}

		this._addItem(addInitialItems);



		var navigation = container.appendChild(new Element('div', {
			"class": "activity-nav nav"
		}));

		this._addButton = navigation.appendChild(new Element('button', {
			html: opt.addLabel || "Add Item",
			"class": "add-item-btn",
			events: {
				click: (e) => {
					e.stopPropagation();
					e.preventDefault();

					if(!this.isValid()){
						this.showErrors();
						return;
					}

					// if (this._nextItems.length > 0) {
					// 	this.setCurrentIndexNext();
					// 	return;
					// }

					this._addItemClick();

				}
			}
		}));


		return this;


	}


	removeItem(index){

		var items=this.getItems();
		
		var itemAtIndex=items[index];

		this._removeItemData(itemAtIndex, index);
		itemAtIndex.parentNode.removeChild(itemAtIndex);

		if(this._nextItems.indexOf(itemAtIndex)>=0){
			this._nextItems.splice(this._nextItems.indexOf(itemAtIndex), 1);
		}

		if(this._previousItems.indexOf(itemAtIndex)>=0){
			this._previousItems.splice(this._previousItems.indexOf(itemAtIndex), 1);
		}
		
		var itemsAfter=items.slice(index+1);
		itemsAfter.forEach((itemAfterEl, i)=>{
			this._shiftItemData(itemAfterEl, index+i+1, index+i);
		})
		
		itemsAfter.forEach((itemAfterEl, i)=>{
			this._redrawItem(itemAfterEl, index+i);
		});

		this._autoIndex--;

		if(itemAtIndex==this._currentItem){
			this._currentItem=null;

			if(index<this.getItems().length){
				this.setCurrentIndex(index);
			}else{
				this.setCurrentIndex(index-1);
			}

			this._throttleUpdate();

		}
		
		// TODO:  set new current
		// this._currentItem = allItems[index];
		//this._previousItems = allItems.slice(0, index);

	}

	_removeItemData(itemEl, index){

		var dataset=this._getItemDataRaw(itemEl);
		this._page.unsetContextData(Object.keys(dataset));

	}
	_shiftItemData(itemEl, currentIndex, newIndex){

		var dataset=this._getItemDataRaw(itemEl);
		var unsetKeys=Object.keys(dataset);
		this._page.unsetContextData(unsetKeys);
		var newDataset={};
		Object.keys(dataset).forEach((key)=>{
			newDataset[key.split(currentIndex).slice(0, -1).join(currentIndex)+newIndex]=dataset[key];
		});
		this._page.setContextData(newDataset);

	}

	_redrawItem(itemEl, index){

		itemEl.innerHTML='';
		//leave style, and attribute tags

		itemEl.dataset['index']=index;
		
		this._page.withVariables({
			"loopIndex": index
		}, () => {
			var activityEl = itemEl;

			var returnVar = this._defaultRenderFn(activityEl);


			if(!(returnVar instanceof Promise)){
				returnVar=Promise.resolve(true);
			}


			returnVar.then(()=>{

				/**
				* this needs to be chained in a promise, if _defaultRenderFn returns one
				*/
				this._page.updateFormInputs(activityEl);

				this._addItemButtons(activityEl, index);

				this._throttleUpdate();
				
			});

		});
	}

	addItem(){
		this._addItem();
	}

	insertItem(index){
		this._insertItem(index);
	}

	_insertItem(index, then){

		var itemsBefore=this.getItems().slice(0, index);
		var itemsAfter=this.getItems().slice(index);

		this._previousItems=itemsBefore;
		this._nextItems=itemsAfter;

		/**
		 * Start at the end - so as not to overwrite.
		 */
		itemsAfter.reverse().forEach((itemAfterEl, i)=>{
			var fromIndex = index+(itemsAfter.length-i)-1;
			var toIndex = index+(itemsAfter.length-i)
			this._shiftItemData(itemAfterEl, fromIndex, toIndex);
			this._redrawItem(itemAfterEl, toIndex);
		});
		

		this._page.withVariables({
			"loopIndex": index
		}, () => {
			var activityEl = new Element('div', {
				"class": "active",
				events: {
					click: () => {
						if (activityEl != this._currentItem) {
							if(!this.isValid()){
								this.showErrors();
								return;
							}
							this.setCurrentItem(activityEl)
						}
					}
				}
			});
			if(itemsAfter.length>0){
				itemsAfter[0].before(activityEl);
			}else{
				this._wrap.appendChild(activityEl);
			}
			

			activityEl.dataset['index']=this._autoIndex;

			var returnVar = this._defaultRenderFn(activityEl);


			if(!(returnVar instanceof Promise)){
				returnVar=Promise.resolve(true);
			}


			returnVar.then(()=>{


				/**
				* this needs to be chained in a promise, if _defaultRenderFn returns one
				*/
				this._page.updateFormInputs(activityEl);

				this._addItemButtons(activityEl, index);
				this._currentItem=activityEl;
				if(this._insertThrottleEmit){
					clearTimeout(this._insertThrottleEmit);
				}
				this._insertThrottleEmit=setTimeout(()=>{
					delete this._insertThrottleEmit;
					this.emit('select', this.getItems().indexOf(activityEl));
				}, 100);


				this.setCurrentIndex(index);
				this.emit('addItem', activityEl, index);
				

				this._autoIndex++;
				this._throttleUpdate();

				if(then){
					then(activityEl);
				}

			})

		});


	}

	_addItemClick(){
		// TODO add validation check
		this._addItem();
	}
	_addItem(then) {
		this._insertItem(this._autoIndex, then);
	}




	getCurrentIndex() {
		return this.getItems().indexOf(this._currentItem);
	}

	setCurrentIndexNext() {
		setCurrentIndex(this._previousItems.length + 1)
	}

	setCurrentItem(el) {

		var i = this.getItems().indexOf(el);
		if (i >= 0) {
			this.setCurrentIndex(i);
		}
	}

	setCurrentIndex(index) {

		var current=this.getCurrentIndex();
		

		var allItems = this.getItems();
		allItems.forEach((item) => {
			item.classList.add('collapse');
			item.classList.remove('active');
		});

		

		this._previousItems = allItems.slice(0, index);
		this._nextItems = allItems.slice(index + 1);
		this._currentItem = allItems[index];
		this._currentItem.classList.remove('collapse');
		this._currentItem.classList.add('active');

		if(current===index){
			return;
		}

		this.emit('select', index);

		this._throttleUpdate();
	}

	_addItemButtons(el, index) {
		var inlineNav = el.appendChild(new Element('div', {
			"class": "nav inline-nav"
		}))
		inlineNav.appendChild(new Element('button', {
			html: "Edit",
			"class": "edit-btn",
			events: {
				click: (e) => {
					e.preventDefault();
					this.setCurrentIndex(index);
				}
			}
		}));


		inlineNav.appendChild(new Element('button', {
			"class": "remove-btn",
			html: this.options.deleteLabel||"Delete",
			events: {
				click: (e) => {

					e.stopPropagation();
					e.preventDefault();

					if(!confirm(this.options.confirmDeleteLabel||"Are you sure you want to delete this item?")){
						return;
					}

					this.removeItem(index);
					this._throttleUpdate();
				}
			}
		}));


	}

}