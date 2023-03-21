
import {
	EventEmitter
} from 'events';

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

	remove(){
		this.emit('remove');
	}


	getData(){
		return this._renderer.getFormData();
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