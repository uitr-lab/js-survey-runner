import { LoopRender } from "./LoopRender";
import { Element } from "../Element";

import {
	EventEmitter
} from 'events';

export class SelectionSortRender extends EventEmitter {

	constructor(page) {
		super();
		this._page = page
		// this._addButtons=[];
	}

	renderSortLoop(fieldName, renderFn, container, options) {

		this._fieldName = fieldName;
		this._container=container;
		this._loop = (new LoopRender(this._page)).renderFieldValueCount(fieldName, renderFn, container, options);

		this._selectedList = null;



		Array.from(this._loop.container.childNodes).forEach((el) => {
			el.addEventListener('click', () => {

				this.addSelection(el)
				this.emit('update', this._getOrder());
				this._page.getRenderer().needsUpdateValidation();
			});
		});

		if (options && options.selection) {
			this._redraw(options.selection);
		}


		this.autoValidate()

		return this;

	}

	addSelection(el) {
		el.classList.add('selected');
		if (!this._selectedList) {
			this._resetBtn = this._container.appendChild(new Element('button', {
				html: "Reset",
				"class": "nav",
				events: {
					click: () => {
						Array.from(this._loop.container.childNodes).forEach((el) => {
							el.classList.remove('selected')
						});
						this._selectedList.parentNode.removeChild(this._selectedList);
						this._selectedList = null;
						this._resetBtn.parentNode.removeChild(this._resetBtn);
						this._resetBtn=null;
						this.emit('update', this._getOrder());
						this._page.getRenderer().needsUpdateValidation();
					}
				}
			}));


			this._selectedList = this._container.appendChild(new Element('div'))
		}
		var childEl = new Element('div');
		childEl.innerHTML = el.innerHTML;
		childEl.dataset['index'] = el.dataset['index'];

		var controlsEl=childEl.appendChild(new Element('div', {"class":"ctrls"}));


		controlsEl.appendChild(new Element('button', {
			html: "Up", "class": "sort-up", 
			events: {
				click: () => {

					var order = this._getOrder();
					var item = parseInt(childEl.dataset['index']);
					var index = order.indexOf(item);
					if (index > 0) {
						var cut = order.splice(index - 1, 1)
						order.splice(index, 0, cut[0])
						this._redraw(order);
						this.emit('update', this._getOrder());
						this._page.getRenderer().needsUpdateValidation();
					}


				}
			}
		}));
		controlsEl.appendChild(new Element('button', { 
			html: "Down", "class": "sort-down", 
			events: { 
				click: () => { 
					
					var order = this._getOrder();
					var item = parseInt(childEl.dataset['index']);
					var index = order.indexOf(item);
					if (index < order.length - 1) {
						var cut = order.splice(index + 1, 1)
						order.splice(index, 0, cut[0])
						this._redraw(order);
						this.emit('update', this._getOrder());
						this._page.getRenderer().needsUpdateValidation();
					}
				
				} 
			}
		}));
		controlsEl.appendChild(new Element('button', { 
			html: "Remove", "class": "sort-remove", 
			events: { 
				click: () => { 

					var order = this._getOrder();
					var item = parseInt(childEl.dataset['index']);

					this._loop.container.childNodes.item(item).classList.remove('selected');

					var index = order.indexOf(item);
					
					var cut = order.splice(index, 1)
					this._redraw(order);
					this.emit('update', this._getOrder());
					this._page.getRenderer().needsUpdateValidation();
				

				} 
			} 
		}));

		this._selectedList.appendChild(childEl)


	}

	_redraw(order) {

		if(this._selectedList){
			this._selectedList.parentNode.removeChild(this._selectedList);
			this._selectedList = null;
			this._resetBtn.parentNode.removeChild(this._resetBtn);
			this._resetBtn=null
		}

		order.forEach((i) => {
			this.addSelection(this._loop.container.childNodes.item(i));
		})
	}

	_getOrder() {
		if (this._selectedList) {
			return Array.from(this._selectedList.childNodes).map((el) => {
				return parseInt(el.dataset['index'])
			});

		}
		return [];
	}


	autoValidate() {

		this._page.addValidator((formData, pageData, opts) => {
			return new Promise((resolve) => {
				try {
					if (this._isHidden(this._loop.container)) {
						resolve();
						return;
					}
					if (this._selectedList && Array.from(this._loop.container.childNodes).length == Array.from(this._selectedList.childNodes).length) {
						resolve();
						return;
					}
				} catch (e) {
					console.error(e);
				}
				throw { errors: ['Need to select all options'], fields: [this._fieldName] };
			})
		});

	}


	_isHidden(el) {

		if (!(el && el instanceof HTMLElement)) {
			return false;
		}
		var style = window.getComputedStyle(el);

		if (style.display === 'none') {
			return true;
		}

		return this._isHidden(el.parentNode);


	}



}
