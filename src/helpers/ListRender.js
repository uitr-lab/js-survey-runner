
import {
	Element
} from '../Element.js'


export class ListRender {

	constructor(page) {
		this._page = page


		this._previousItems = [];
		this._nextItems = [];
		this._currentItem = null;
		this._index = 0;



		this._page.on('update', ()=>{

			if(this._currentItem){
			
				var data=this._page.getContextData();

				Object.keys(this._currentItem.dataset).forEach((key)=>{
					delete this._currentItem.dataset[key];
				});

				var dataset={};
				Array.prototype.slice.call(this._currentItem.querySelectorAll("*")).forEach((el) => {

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

				Object.keys(dataset).forEach((key)=>{
					this._currentItem.dataset[key]=dataset[key];
				});
				
			}

		});

	}

	setDatasetKeyFormatter(fn){
		this._datasetKeyFmt=fn;
		return this;
	}

	setDatasetFormatter(fn){
		this._datasetFmt=fn;
		return this;
	}

	renderList(defaultRenderFn, container, opt) {

		this._defaultRenderFn=defaultRenderFn;

		opt=opt||{};

		this._wrap = container.appendChild(new Element('div', {
			"class":"list-render"
		}));




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
		});

		this._index++;


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


						var allItems = this._previousItems.concat([this._currentItem], this._nextItems);
						allItems.forEach((item) => {
							item.classList.add('collapse');
						});

						this._previousItems = allItems.slice(0, index);
						this._nextItems = allItems.slice(index + 1);
						this._currentItem = allItems[index];
						this._currentItem.classList.remove('collapse');
						this._currentItem.classList.add('active');

					}
				}
			}));


			inlineNav.appendChild(new Element('button', {
				"class":"remove-btn",
				html: "Delete",
				events: {
					click: (e) =>{
						e.preventDefault();


					}
				}
			}));


		}

}