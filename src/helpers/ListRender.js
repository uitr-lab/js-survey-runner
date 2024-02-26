import {
	EventEmitter
} from 'events';

import {
	Element
} from '../Element.js'


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

	}

	needsUpdate() {
		this._page.needsUpdate();
	}

	_throttleUpdate() {

		if (this._updateTimeout) {
			clearTimeout(this._updateTimeout);
		}

		this._updateTimeout = setTimeout(() => {
			this._updateTimeout = null;
			this._update();

		}, 250);



	}
	_update() {
		if (this._currentItem) {

			Object.keys(this._currentItem.dataset).forEach((key) => {
				if(key=='index'){
					return;
				}
				delete this._currentItem.dataset[key];
			});

			var dataset = this._getDataItem(this._currentItem);

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

	_getItemDataRaw(itemEl, data) {

		data = data || this._page.getContextData();



		var dataset = {};
		Array.prototype.slice.call(itemEl.querySelectorAll("*")).forEach((el) => {

			if (el.name) {
				if (typeof data[el.name] != 'undefined') {
					dataset[el.name] = el.value;
				}
			}

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

		var next = navigation.appendChild(new Element('button', {
			html: opt.addLabel || "Add Item",
			"class": "add-item-btn",
			events: {
				click: (e) => {
					e.stopPropagation();
					e.preventDefault();

					// if (this._nextItems.length > 0) {
					// 	this.setCurrentIndexNext();
					// 	return;
					// }

					this._addItem();

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
				this.setCurrentIndex(index);
				this.emit('addItem', activityEl, index);

				this._autoIndex++;


				if(then){
					then(activityEl);
				}

			})

		});


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