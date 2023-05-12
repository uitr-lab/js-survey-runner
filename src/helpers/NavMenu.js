import  { EventEmitter } from  'events';



export class NavMenu extends EventEmitter {


	constructor(renderer, options){

		super();
		this._renderer=renderer;

	 }



	 linkExistingMenu(selector, options){



	 	this._renderer.on('renderPage', ()=>{

				Array.prototype.slice.call(document.querySelectorAll(selector)).forEach((menuItem, index)=>{

					if(options.nodeIds){

						if(index>=options.nodeIds.length){
							return;
						}

						var uuid=options.nodeIds[index];

						if(!uuid){
							return;
						}


						menuItem.classList.add('with-navigation');

						menuItem.addEventListener('click', ()=>{

							this._renderer.navigateTo(uuid);

						});

					}

				})
			
		});
	 

	 }

}