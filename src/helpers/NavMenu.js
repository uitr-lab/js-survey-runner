import  { EventEmitter } from  'events';


export class NavMenu extends EventEmitter {


	constructor(renderer, options){

		super();
		this._renderer=renderer;
		this._requireVisited=false;
	 }

	 requireVisited(){
		this._requireVisited=true;
		return this;
	 }

	 linkExistingMenu(selector, options){



	 	this._renderer.on('renderPage', ()=>{

				Array.prototype.slice.call(document.querySelectorAll(selector)).forEach((menuItem, index)=>{

					if(options.nodeIds){

						if(index>=options.nodeIds.length){
							return;
						}

						var uuid=options.nodeIds[index];
						if(typeof uuid=='function'){
							uuid=uuid(menuItem, index);
						}
						menuItem.setAttribute('data-uuid-target', uuid||'no-uuid');

						if(!uuid){
							menuItem.classList.add('invalid-uuid');
							return;
						}

						var data=this._renderer.getFormData();


						var completedKey=null;
						Object.keys(data).forEach((key)=>{
							if(key.indexOf('visited_'+uuid)===0){
								completedKey=key;
							}
						});

						if(completedKey){
							menuItem.classList.add('visited');
						}else{
							menuItem.classList.add('unvisited');
							return;
						}

						menuItem.classList.add('with-navigation');

						menuItem.addEventListener('click', ()=>{

							this.emit('select', menuItem, uuid, index);
							this._renderer.navigateTo(uuid);

						});

					}

				})
			
		});
	 

		return this;

	 }

}