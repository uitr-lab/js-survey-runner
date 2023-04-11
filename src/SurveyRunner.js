import {
	Element
} from './Element.js'

import {
	EventEmitter
} from 'events';

import {
	PageRenderer
} from './PageRenderer.js';



export class SurveyRenderer extends EventEmitter {


	constructor() {
		super();

		this._options={
			completeLabel:"Complete",
			completePageHtml:"Complete! Thank you."
		};

		this.on('renderPage', (page) => {
			setTimeout(() => {
				this._container.scrollTo(0, 0);
				if (this._container.parentNode) {
					this._container.parentNode.scrollTo(0, 0);
				}
			}, 100);

		})

	}


	setOptions(opt){

		this._options=opt;

	}

	displayInfo() {
		this._displayInfo = true;
		return this;
	}


	static addItem(type, renderer) {

		PageRenderer._renderers[type] = renderer;


	}

	addLocalizationsMap(map) {

		this._lang = 'en';
		this._map = map;

	}

	useLocalStorageLocalizationsMap(name) {

		var storedData = localStorage.getItem(name);
		if (storedData) {
			storedData = JSON.parse(storedData);
			this.addLocalizationsMap(storedData);
		}

	}


	_setSourceFile(file) {
		this._sourceFile = file;
	}

	_setSourceBase(base) {
		this._sourceBase = base;
	}


	static addFormatter(name, fn) {

		SurveyRenderer._formatters = SurveyRenderer._formatters || {};
		SurveyRenderer._formatters[name] = fn;

	}

	getFormatter(name) {
		return (...args) => {

			if(name.indexOf('(')>0){

				try{
					var extraArgs = name.split('(', 2).pop();
					extraArgs=JSON.parse('['+extraArgs.substring(0, extraArgs.length - 1)+']');
					args=args.concat(extraArgs);
				}catch(e){
					console.error(e);
				}

			}

			name = name.split('(').shift();
			


			return ((SurveyRenderer._formatters || {})[name] || (() => { })).apply(null, args);
		}
	}

	localize(label, from, to) {


		from = from || 'en';
		to = to || 'en';

		if (from === to) {
			return label;
		}

		var fromMap = this._map[from || 'en'];

		var results = Object.keys(this._map[from || 'en']).filter((key) => {
			return fromMap[key] === label;
		});

		if (results.length) {
			var toMap = this._map[to || 'fr'];
			if (toMap && typeof toMap[results[0]] === 'string') {
				return toMap[results[0]];
			}
		}


		return label;
	}

	render(definition, data) {


		if (typeof definition == 'string') {
			fetch(definition, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
				},
				cache: "no-store"
			})
				.then(response => response.json())
				.then(definition => {
					this._render(definition, data);
				});

			this._container = new Element('div');
			return this._container;
		}

		this._container = new Element('div');
		this._render(definition, data);
		return this._container;

	}

	_render(definition, data) {


		this._data = definition;
		this._formData = {}

		if (data) {
			this.setFormData(data);
		}

		var form = this._container.appendChild(new Element('form', {
			"class": "survey-view"
		}));

		form.addEventListener('focusin', (e)=>{

			if(typeof e.target.name=='string'){
				if(this._target&&this._target!==this._lastTarget){

					this._lastTarget=this._target;
					this.emit('unfocus', this._lastTarget);

				}
				this._target=e.target;
				this.emit('focus', this._target);
				return;
			}

			if(this._target&&this._target!==this._lastTarget){
				this._lastTarget=this._target;
				this.emit('unfocus', this._lastTarget);
			}
			this._target=null;
		})

		this._element = form;


		if (this._displayInfo) {

			this._dataPreview = this._container.appendChild(new Element('pre', {
				"class": "survey-data",
				html: JSON.stringify(this._formData, null, '   ')
			}))

			this.on('update', () => {
				this._dataPreview.innerHTML = JSON.stringify(this._formData, null, '   ');
			})

		}

		if (definition.type == 'set' && definition.items) {
			form.classList.add('set-view');
			this._renderSet(definition);

		}



		if (definition.type == 'section' && definition.items) {

			this._renderNode(definition);
		}



		form.addEventListener('change', () => {
			this._update();
			this._validate();
		});

	}
	_setForwardBtn(btn) {
		this._forwardBtns = this._forwardBtns || [];
		this._forwardBtns.push(btn);

		if (this._disableForward) {
			btn.disabled = true;
			btn.classList.add('disabled');
		}
	}

	disableForwardNavigation() {

		this._disableForward = true;
		(this._forwardBtns || []).forEach((btn) => {
			btn.disabled = true;
			btn.classList.add('disabled');
		});

	}

	enableForwardNavigation() {
		delete this._disableForward;
		(this._forwardBtns || []).forEach((btn) => {
			btn.disabled = null;
			btn.classList.remove('disabled');
		});

	}


	addValidator(validator) {

		this._validators = this._validators || [];
		this._validators.push(validator);

		//automatically disable forward navigation on add validator
		this.disableForwardNavigation();

	}


	addTransform(transform) {


		this._transforms = this._transforms || [];
		this._transforms.push(transform);

	}


	getInput(name) {

		var results = Array.prototype.slice.call(this._element.querySelectorAll("*")).filter((el) => {
			return el.name === name;
		});


		return results[0].parentNode;

	}

	_validate() {

		Promise.all((this._validators || []).map((validator) => {

			return new Promise((resolve, reject) => {

				resolve(validator(this.getFormData(), this.getPageData()));

			});

		})).then((results) => {

			console.log(results);
			this.enableForwardNavigation();


		}).catch((errors) => {

			console.log(errors);
			this.disableForwardNavigation();

		});

	}

	needsUpdate() {
		this._update();
	}

	_update() {

		var formDataObject = new FormData(this._element);
		for (const key of formDataObject.keys()) {
			this._currentFormData()[key] = formDataObject.get(key);
		}

		(this._transforms || []).forEach((transform) => {
			try {

				transform();

			} catch (e) {
				console.error(e);
			}
		});

		this.emit('update');

	}

	_findNode(uuid, data) {

		data = data || this._data;
		if (data.uuid === uuid) {
			return data;
		}

		if (!(data.nodes && data.nodes.length > 0)) {
			return null;
		}

		var matches = data.nodes.map((node) => {
			return this._findNode(uuid, node);
		}).filter((node) => {
			return !!node;
		});

		if (matches.length == 0) {
			return null;
		}

		return matches[0];
	}

	_findNextNodePrefix(uuid, data) {

		var matches = data.nodes.filter((node) => {
			return node.uuid === uuid;
		})

		if (matches.length == 0) {
			matches = data.nodes.filter((node) => {
				return (node.uuid || node).indexOf(uuid) === 0;
			});
		}

		if (matches.length == 0) {
			return null;
		}

		var match = matches[0];
		if (typeof match == 'string') {
			return this._findNode(match);
		}

		return match;

	}

	_resetContext() {

		this.useFormData(); //reset any loop data offsets
		this._disableForward = false;
		delete this._validators;
		delete this._transforms;

	}

	_renderNode(data, container) {

		this._setSourceBase(data.name)

		this._resetContext()

		container = container || this._element;

		var node = container.appendChild(new Element('main'));

		if (this._displayInfo) {

			node.appendChild(new Element('h1', {
				"class": 'node-label',
				html: data.name
			}));
		}

		this._renderSetNavigation(data.items, 0, node, (set) => {

			if (data.nodes && data.nodes.length) {

				return new Element('button', {
					html: "Next",
					events: {
						click: (e) => {

							this._update();

							e.stopPropagation();
							node.parentNode.removeChild(node);


							var nextNode = data.nodes[0];

							var index = ((formData, pageData, renderer) => {
								return eval('(function(){ ' + "\n\n" + data.navigationLogic + "\n\n" + ' })()')
							})(this.getFormData(), this.getPageData(), this);

							var handleIndex = (index) => {

								if (typeof index == 'number') {
									index = parseInt(index);
									nextNode = data.nodes[index];
								}

								if (typeof index == 'string') {

									nextNode = this._findNextNodePrefix(index, data) || this._findNode(index);
									//throw 'Not implemented: Navigation to node uuid';
								}

								if (typeof nextNode == 'string') {
									nextNode = this._findNode(nextNode);
									//throw 'Not implemented: Navigation to node uuid';
								}


								if (index instanceof Promise) {
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



	_renderSetNavigation(items, i, container, complete) {

		this._disableForward = false;
		delete this._validators;
		delete this._transforms;

		container = container || this._element;

		var set = container.appendChild(new Element('div'));

		this._renderSet(items[i], set).then(() => {



			var nav = set.appendChild(new Element('nav'));


			if (i > 0) {

				nav.appendChild(new Element('button', {
					html: "Back",
					events: {
						click: (e) => {

							this._update();

							e.stopPropagation();
							set.parentNode.removeChild(set);
							this._renderSetNavigation(items, --i, container, complete);
						}
					}
				}))
			}

			if (i == items.length - 1) {

				if (typeof complete === 'function') {
					complete = complete();
				}

				complete = complete || new Element('button', {
					html: this._options.completeLabel||"Complete",
					events: {
						click: (e) => {

							this._update();

							e.stopPropagation();
							set.parentNode.removeChild(set);
							this.emit('complete');
							container.appendChild(new Element('h3', {
								"class":"complete-page",
								html: this._options.completePageHtml||"Complete! Thank you."
							}))
						}
					}
				});


				this._setForwardBtn(complete);
				nav.appendChild(complete);

				return;
			}

			this._setForwardBtn(nav.appendChild(new Element('button', {
				html: "Next",
				events: {
					click: (e) => {

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
	getFormData() {
		return JSON.parse(JSON.stringify(this._formData));
	}




	async postFormData(url) {


		const response = await fetch(url, {
			method: "POST", // *GET, POST, PUT, DELETE, etc.
			mode: "same-origin", // no-cors, *cors, same-origin
			cache: "no-store", // *default, no-cache, reload, force-cache, only-if-cached
			credentials: "same-origin", // include, *same-origin, omit
			headers: {
				"Content-Type": "application/json",
				// 'Content-Type': 'application/x-www-form-urlencoded',
			},
			redirect: "follow", // manual, *follow, error
			referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
			body: JSON.stringify(this.getFormData()), // body data type must match "Content-Type" header
		});

		return response.json(); // parses JSON response into native JavaScript objects


	}


	/**
	* For forms with nested pages and loops, this method will return the data in the
	* context of the current page.
	*/
	getPageData() {

		return JSON.parse(JSON.stringify(this._currentFormData()));

	}

	getPage() {
		return this._pageRenderer;
	}


	getFormValue(name) {

		return this.getFormData()[name];

	}

	fetchFormTextValue(name, url) {

		return fetch(url, {
			mode: "no-cors", // no-cors, *cors, same-origin
			cache: "no-cache",
			credentials: "omit",
		}).then((resp) => {

			return resp.text();

		}).then((value) => {

			this.setFormValue(name, value);

		}).catch(console.error)

	}

	fetchFormValue(name, url) {

		return fetch(url, {
			mode: "no-cors", // no-cors, *cors, same-origin
			cache: "no-cache",
			credentials: "omit",
		}).then((resp) => {

			return resp.json();

		}).then((value) => {

			this.setFormValue(name, value);

		}).catch(console.error)

	}


	setFormValue(name, value) {


		value = JSON.parse(JSON.stringify(value));

		this._formData[name] = value;

		this.emit('update');

	}


	unsetFormValue(name) {


		delete this._formData[name];
		this.emit('update');

	}
	/**
	 * @deprecated the wording if this implies form value but is setting page value
	 */
	appendFormValue(name, value) {

		value = JSON.parse(JSON.stringify(value));

		this._currentFormData()[name] = this._currentFormData()[name] || [];
		this._currentFormData()[name].push(value);


		this.emit('update');

	}

	updateFormValue(name, value) {

		value = JSON.parse(JSON.stringify(value));

		this._currentFormData()[name] = value;

		this.emit('update');

	}


	updateFormValues(obj) {

		obj = JSON.parse(JSON.stringify(obj));


		Object.keys(obj).forEach((name) => {
			this._currentFormData()[name] = obj[name];
		});



		this.emit('update');

	}

	setFormData(obj) {

		obj = JSON.parse(JSON.stringify(obj));
		Object.keys(obj).forEach((key) => {
			this._formData[key] = obj[key];
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
	_currentFormData() {

		if (this._useFormData) {
			return this._useFormData;
		}

		return this._formData;
	}

	useFormData() {
		delete this._useFormData;
	}

	useFormDataFieldArray(key, index, defaultValue) {

		if (typeof defaultValue == 'undefined') {
			defaultValue = 0;
		}

		if (typeof index == 'function') {

			try {
				index = index();
			} catch (e) {
				console.error(e);
			}

		}

		if (typeof index != 'number') {
			index = defaultValue;
		}

		this._useFormData = this._useFormData || this._formData; //copy reference;

		if (!Array.isArray(this._useFormData[key])) {
			this._useFormData[key] = [];
		}

		if (typeof this._useFormData[key][index] == 'undefined') {
			this._useFormData[key][index] = {};
		}

		this._useFormData = this._useFormData[key][index];



	}


	getSourceUrl() {


		var path = (this._sourceBase || "page") + "/" + (this._sourceFile) + ".js?"
		path = path.split(' ').join('');

		return '//# sourceURL=survey-runner://survey-items/scripts/' + path

	}

	_renderSet(data, container) {


		container = container || this._element;

		if (this._displayInfo) {
			container.appendChild(new Element('h2', {
				"class": 'set-label',
				html: data.name
			}));
		}


		if (this._pageRenderer) {
			this._pageRenderer.remove();
		}

		this._pageRenderer = new PageRenderer(this, container);

		return this.renderItems(data.items, container).then(() => {


			Array.prototype.slice.call(this._element.querySelectorAll("*")).forEach((el) => {

				if (typeof el.name == 'string' && typeof this._currentFormData()[el.name] != 'undefined') {

					if (el.type === 'checkbox') {
						el.checked = this._currentFormData()[el.name] === 'on';
						return;
					}

					el.value = this._currentFormData()[el.name];
				}

			});

			this._update();
			this.emit('renderSet');
			this.emit('renderPage');

		});


	}

	renderItems(items, container) {
		return this._pageRenderer.renderItems(items, container || this._element);
	}

	renderItem(item, container) {
		return this._pageRenderer.renderItem(item, container || this._element);
	}

	withVariables(vars, cb) {

		var original = {}
		Object.keys(vars).forEach((k) => {
			original[k] = this._formData[k];
			this._formData[k] = vars[k];
		});

		cb();

		Object.keys(vars).forEach((k) => {
			if (typeof original[k] == 'undefined') {
				delete this._formData[k];
				return;
			}
			this._formData[k] = original[k];
		});


	}

}


window.SurveyRenderer = SurveyRenderer;