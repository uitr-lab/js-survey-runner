import  { EventEmitter } from  'events';

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
		this._index = 0;

		

		this._page.on('update', ()=>{
			this._throttleUpdate();
		});

	}

	_throttleUpdate(){

		if(this._updateTimeout){
			clearTimeout(this._updateTimeout);
		}

		this._updateTimeout=setTimeout(()=>{
			this._updateTimeout=null;
			this._update();

		}, 250);

		

	}
	_update(){
		if(this._currentItem){

			Object.keys(this._currentItem.dataset).forEach((key)=>{
				delete this._currentItem.dataset[key];
			});

			var dataset =this._getDataItem(this._currentItem);

			Object.keys(dataset).forEach((key)=>{
				this._currentItem.dataset[key]=dataset[key];
			});
			
			this.emit('update');
		}

	}

	setDatasetKeyFormatter(fn){
		this._datasetKeyFmt=fn;
		return this;
	}

	setDatasetFormatter(fn){
		this._datasetFmt=fn;
		return this;
	}

	getElement(){
		 this._wrap=this._wrap||new Element('div', {
			"class":"list-render"
		});
		 return this._wrap;
	}

	_getDataItem(item, data){

		data=data||this._page.getContextData();

	

		var dataset={};
		Array.prototype.slice.call(item.querySelectorAll("*")).forEach((el) => {

			if(el.name){
				if(typeof data[el.name]!='undefined'){

					var key=el.name;
					if(this._datasetKeyFmt){
						key=this._datasetKeyFmt(key);
					}
					dataset[key]=el.value;
				}
			}

		});

		if(this._datasetFmt){
			dataset=this._datasetFmt(dataset);
		}

		return dataset;

	}

	getItems(){
		return this._previousItems.concat([this._currentItem], this._nextItems).filter((el)=>{
			return !!el;
		});
	}

	getItemsData(){

		var data=this._page.getContextData();

		return this.getItems().map((el)=>{
			return this._getDataItem(el, data);
		});

	}

	renderList(defaultRenderFn, container, opt) {

		this._defaultRenderFn=defaultRenderFn;

		opt=opt||{};

		this._wrap = container.appendChild(this.getElement());




		this._addItem();





		var navigation = container.appendChild(new Element('div', {
			"class": "activity-nav nav"
		}));

		var next = navigation.appendChild(new Element('button', {
			html: opt.addLabel||"Add Item",
			"class":"add-item-btn",
			events: {
				click: (e) => {
					e.preventDefault();
					this._addItem();

				}
			}
		}));


		return this;


	}

	_addItem(){


		if(this._currentItem){

			this._previousItems.push(this._currentItem);
			this._currentItem.classList.remove('active');
			this._currentItem.classList.add('collapse');

		}

		if (this._nextItems.length > 0) {
			this._currentItem = this._nextItems.shift();
			this._currentItem.classList.remove('collapse');
			this._throttleUpdate();
			return;
		}

		this._page.withVariables({
			"loopIndex": this._index
		}, () => {
			var activityEl = this._wrap.appendChild(new Element('div', {
				"class":"active"
			}));

			this._defaultRenderFn(activityEl);
			this._currentItem = activityEl;
			this._addItemButtons(activityEl, this._index);
			this._throttleUpdate();
		});

		this._index++;


	}

	getCurrentIndex(){
		return this.getItems().indexOf(this._currentItem);
	}

	setCurrentIndex(index){
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

	_addItemButtons(el, index){
			var inlineNav = el.appendChild(new Element('div', {
				"class": "nav inline-nav"
			}))
			inlineNav.appendChild(new Element('button', {
				html: "Edit",
				"class":"edit-btn",
				events: {
					click: (e) =>{
						e.preventDefault();
						this.setCurrentIndex(index);
					}
				}
			}));


			inlineNav.appendChild(new Element('button', {
				"class":"remove-btn",
				html: "Delete",
				events: {
					click: (e) =>{
						e.preventDefault();
						this._throttleUpdate();
					}
				}
			}));


		}

}