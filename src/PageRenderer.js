
import {
	EventEmitter
} from 'events';


import {
	LoopRender
} from './helpers/LoopRender.js';

import {
	ListRender
} from './helpers/ListRender.js';

export class PageRenderer extends EventEmitter {


	static _renderers = {}



	constructor(renderer, container) {
		super();

		this._renderer=renderer;
		this._container = container;



		var updateListener=()=>{
			this.emit('update');
		};
		renderer.on('update', updateListener);
		this.on('remove', ()=>{
			renderer.off('remove', updateListener)
		});

	}


	needsUpdate() {
		this._renderer.needsUpdate();
	}

	remove(){
		this.emit('remove');
	}


	getFormData(){
		return this._renderer.getFormData();
	}

	getContextData(){
		return this._renderer.getPageData();
	}

	unsetContextData(keys){
		this._renderer.unsetPageData(keys);
	}

	setContextData(data){
		this._renderer.setPageData(data);
	}

	withVariables(vars, cb) {
		return this._renderer.withVariables(vars, cb);
	}

	updateFormInputs(element){
		return this._renderer.updateFormInputs(element);
	}

	_renderItem(item, container) {



		
		if (typeof PageRenderer._renderers[item.type] == 'function') {
			try {

				this._renderer._setSourceFile(item.type);
				return PageRenderer._renderers[item.type](item, container, this._renderer, this);
			} catch (e) {
				console.error(e);
				this._renderer.appendFormValue('errors', e.message);
			}
			return;

		}

		throw 'Type not defined: ' + item.type


	}


	renderLoop(key, renderFn, container){
		return (new LoopRender(this)).renderFieldValueCount(key, renderFn, container);
	}

	renderList(renderFn, container, options){
		return (new ListRender(this)).renderList(renderFn, container, options);
	}


	renderItem(item, container) {
		return this._renderItem(item, container);
	}


	renderItems(items, container) {


		var list = items.slice(0);


		if (list.length > 0) {


			// var resp=this._renderItem(list.shift(), container);

			// var promise=Promise.resolve();
			// if(resp instanceof Promise){
			// 	promise=resp;
			// }

			return new Promise((resolve) => {

				resolve(this._renderItem(list.shift(), container));

			}).then(() => {

				return this.renderItems(list, container);

			});


		}

		return Promise.resolve();

		items.forEach((item) => {



		});



	}

}