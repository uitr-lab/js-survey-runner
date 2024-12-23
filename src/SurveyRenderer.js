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

		this._options = {
			completeLabel: "Complete",
			completePageHtml: "Complete! Thank you.",
		};

		this.on('renderPage', (page) => {
			this.scrollToTop();
		})

	}


	getConfigValue(key, defaultValue) {

		var config = this._config || {};
		if (typeof config[key] == 'undefined') {

			if (typeof defaultValue == 'function') {
				return defaultValue();
			}
			return defaultValue;
		}

		return config[key];

	}

	setConfigValue(key, value) {

		this._config = this._config || {};
		this._config[key] = value;

		return this;
	}

	getLabelFor(...args) {


		var key = args.shift();
		var defaultValue = args.pop();

		var data = {};

		args.forEach((arg) => {
			if (arg[key]) {
				data[key] = arg[key];
			}
		});


		return data[key] || this._options[key] || defaultValue;
	}


	setOptions(opt) {

		this._options = opt;

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
		this._scriptIndex = 0;
		this._sourceBase = base;
	}


	static addFormatter(name, fn) {

		SurveyRenderer._formatters = SurveyRenderer._formatters || {};
		SurveyRenderer._formatters[name] = fn;

	}

	getFormatter(name) {
		return (...args) => {

			if (name.indexOf('|') > 0) {
				var chain = name.split('|');

				var returnVal = null;
				while (chain.length > 0) {
					this.getFormatter(chain.shift()).apply(null, args);
				}

				return;

			}


			if (name.indexOf('(') > 0) {

				try {
					var extraArgs = name.split('(', 2).pop();
					extraArgs = JSON.parse('[' + extraArgs.substring(0, extraArgs.length - 1) + ']');
					args = args.concat(extraArgs);
				} catch (e) {
					console.error(e);
				}

			}

			name = name.split('(').shift();

			args.push(this);

			return ((SurveyRenderer._formatters || {})[name] || (() => { })).apply(null, args);
		}
	}

	static setLabelFormatter(fmt) {

		SurveyRenderer._labelFmt = fmt;

	}

	formatLabel(label, field) {

		if (field && field.label === label) {
			// auto parameterize field label only
			label = this.parameterize(label, field);
		}

		label = this.localize(label);

		if (SurveyRenderer._labelFmt) {
			return SurveyRenderer._labelFmt(label, this);
		}

		return label;

	}

	static setLabelParameterizer(pmtr) {
		SurveyRenderer._labelPmtr = pmtr;

	}

	static useFieldNamePrefixedParameterizer(prefix) {

		SurveyRenderer.setLabelParameterizer((label, field, renderer) => {

			if (field.fieldName) {
				var fieldName = field.fieldName.split('{').join('_').split('}').join('_');
				var variableContent = renderer.formatLabel("{{" + prefix + fieldName + "|default('EMPTY')}}");
				if (variableContent !== 'EMPTY') {
					return variableContent;
				}
			}

			return label;


		});


	}


	parameterize(label, field) {

		if (SurveyRenderer._labelPmtr) {
			return SurveyRenderer._labelPmtr(label, field, this);
		}


		return label;
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

	getElement() {
		return this._container;
	}

	scrollToTop() {
		setTimeout(() => {
			this._container.scrollTo(0, 0);
			if (this._container.parentNode) {
				this._container.parentNode.scrollTo(0, 0);
			}
		}, 100);
	}

	getPreviousTarget() {
		return this._lastTarget || null;
	}

	/**
	 * returns the active (in focus) input element
	 */
	getCurrentTarget() {
		return this._target || null;
	}

	restart() {
		this._container.innerHTML = '';
		this._render(this._data);
	}

	_render(definition, data) {



		this._data = definition;
		this._formData = {}

		if (data) {
			this.setFormData(data);
		}

		this.emit('beforeRender', definition, data||{});



		var form = this._container.appendChild(new Element('form', {
			"class": "survey-view"
		}));


		form.addEventListener('keydown', function(event) {
			if (event.key === "Enter") {
				event.preventDefault(); // Prevent form submission on Enter key press
			}
		});

		form.onsubmit = () => {
			return false;
		}

		if (this._hasTouchScreen()) {
			form.classList.add('touchscreen');
		} else {
			form.classList.add('desktop');
		}


		form.addEventListener('focusin', (e) => {

			if (typeof e.target.name == 'string') {
				if (this._target && this._target !== this._lastTarget) {

					this._lastTarget = this._target;
					this.emit('unfocus', this._lastTarget);

				}
				this._target = e.target;
				this.emit('focus', this._target);
				return;
			}

			if (this._target && this._target !== this._lastTarget) {
				this._lastTarget = this._target;
				this.emit('unfocus', this._lastTarget);
			}
			this._target = null;
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
			this._renderPage(definition);

		}



		if (definition.type == 'section' && definition.items) {

			this._renderNode(definition);
		}



		form.addEventListener('change', () => {
			this._update();
			this._validate();
		});

		form.addEventListener('input', (e) => {
			this._needsLateUpdateValidate();
		});



	}

	_hasTouchScreen() {
		return 'ontouchstart' in document.documentElement
			|| navigator.maxTouchPoints > 0
			|| navigator.msMaxTouchPoints > 0;
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

		if (results.length == 0) {
			return null;
		}

		return results[0].parentNode;

	}

	needsValidation() {

		if (this._throttleValidation) {
			clearTimeout(this._throttleValidation);
		}
		this._throttleValidation = setTimeout(() => {
			this._throttleValidation = null;
			this._validate({
				"showNewWarnings": false
			});
		}, 100);
	}

	needsUpdateValidation() {
		return this._needsLateUpdateValidate();
	}

	_needsLateUpdateValidate() {

		if (this._throttleLateUpdate) {
			clearTimeout(this._throttleLateUpdate);
		}
		this._throttleLateUpdate = setTimeout(() => {
			this._throttleLateUpdate = null;
			this._update();
			this.needsValidation();
		}, 500);


	}


	_validate(opts) {

		opts = opts || {};

		Promise.all((this._validators || []).map((validator) => {

			return new Promise((resolve, reject) => {

				resolve(validator(this.getFormData(), this.getPageData(), opts));

			});

		})).then((results) => {

			console.log(results);
			this.enableForwardNavigation();
			this.emit('validation');

		}).catch((errors) => {

			console.log(errors);
			this.disableForwardNavigation();
			this.emit('failedValidation', errors);

		});

	}

	needsUpdate() {
		if (this._throttleUpdate) {
			clearTimeout(this._throttleUpdate);
		}
		this._trottleUpdate = setTimeout(() => {
			this._throttleUpdate = null;
			this._update();
		}, 100);

	}

	_update() {

		var formDataObject = new FormData(this._element);

		var data = this._currentFormData(); //object reference

		for (const key of formDataObject.keys()) {
			data[key] = formDataObject.get(key);
		}

		// fix missing checkboxes:
		Array.prototype.slice.call(this._element.querySelectorAll('input[type="checkbox"]')).forEach((cbx)=>{
			var key=cbx.name;
			if(typeof key == 'string' && key!==""){
				if(typeof data[key]=='undefined'){
					data[key]=""
				}
			}
		});
	

		Array.prototype.slice.call(this._element.querySelectorAll("*")).forEach((el) => {
			if (typeof el.name == 'string' && el.name !== "") {

				/**
				 * FormData does not include unselected radio fields, or selections 
				 * but here we want the empty value to be set
				 */

				if (el.type === 'radio') {
					if (typeof data[el.name] == 'undefined') {
						data[el.name] = '';
					}
				}

				if (el.tagName === 'SELECT') {
					if (typeof data[el.name] == 'undefined') {
						data[el.name] = '';
					}
				}


			}
		})


		for (const entry of formDataObject.entries()) {
			console.log(entry);

		}

		(this._transforms || []).forEach((transform) => {
			try {

				var resp = transform(data);

				if (!resp) {
					return;
				}
				this.setPageData(resp, data);

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

	_searchNode(searchFn, data) {

		data = data || this._data;
		if (searchFn(data)) {
			return data;
		}

		if (!(data.nodes && data.nodes.length > 0)) {
			return null;
		}

		var matches = data.nodes.map((node) => {
			return this._searchNode(searchFn, node);
		}).filter((node) => {
			return !!node;
		});

		if (matches.length == 0) {
			return null;
		}

		return matches[0];
	}

	_getDataTemplateType(type, node) {

		var found = null;

		if(node.template&&node.type+'.'+node.template===type){
			return node;
		}

		(node.items || []).forEach((block) => {

			if(found){
				return;
			}

			if (block.items) {
				found = this._getDataTemplateType(type, block);
				if(found){
					return;
				}
			}
		});


		//only check current node;

		// if(found){
		// 	return found;
		// }

		// (node.nodes || []).forEach((child) => {
		// 	if(found){
		// 		return;
		// 	}
		// 	found = this._getDataTemplateType(type, child);
		// });

		return found;
	}

	searchRenderTemplate(item, container, pageRenderer){

			/**
			 * 
			 */

			var dataNode = this._searchNode((data) => {
				return this._getDataTemplateType(item.type, data);
			});

			if(!dataNode){
				throw 'Type not defined: ' + item.type
			}
			var dataItem = this._getDataTemplateType(item.type, dataNode);

		


			return new Promise((resolve) => {
				
				this._setSourceFile(dataItem.type);
				resolve(PageRenderer._renderers[dataItem.type](dataItem, container, this, pageRenderer));

			}).then(() => {

				this._setSourceFile(item.type);
				return PageRenderer._renderers[item.type](item, container, this, pageRenderer);

			});


			

		}

	/**
	 * Searches entire node tree (unlike findNextNodePrefix), but is less strict than _findNode
	 */
	_findNodePrefix(uuid, data) {

			data = data || this._data;
			if(data.uuid && data.uuid.indexOf(uuid) === 0) {
			return data;
		}

		if (!(data.nodes && data.nodes.length > 0)) {
			return null;
		}

		var matches = data.nodes.map((node) => {
			return this._findNodePrefix(uuid, node);
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

	_executeNavigationLogic(data) {

		return ((formData, pageData, renderer) => {
			return eval('(function(){ ' + "\n\n" + data.navigationLogic + "\n\n" + ' })()' + this.getSourceUrl('forwardNavigation'));
		})(this.getFormData(), this.getPageData(), this);
	}

	_executeBackNavigationLogic(data, previous) {

		return ((formData, pageData, renderer) => {
			return eval('(function(){ ' + "\n\n" + data.backLogic + "\n\n" + ' })()' + this.getSourceUrl('backNavigation'));
		})(this.getFormData(), this.getPageData(), this);
	}

	_executeOnNavigationEntryLogic(data) {

		return ((formData, pageData, renderer) => {
			return eval('(function(){ ' + "\n\n" + data.entryLogic + "\n\n" + ' })()' + this.getSourceUrl('entry'));
		})(this.getFormData(), this.getPageData(), this);
	}

	_executeOnNavigationExitLogic(data, next) {

		return ((formData, pageData, renderer) => {
			return eval('(function(){ ' + "\n\n" + data.exitLogic + "\n\n" + ' })()' + this.getSourceUrl('exit'));
		})(this.getFormData(), this.getPageData(), this);
	}

	_setNext(fn) {
		this._next = fn;
		return this;
	}

	next() {

		var fn = this._next;
		delete this._next;

		if (this._stack.length > 0) {
			this.setFormValue('completed_' + this._stack.slice().pop().uuid, true);
		}

		fn();
		return this;
	}

	_push(nodeData) {
		if (!this._stack) {
			this._stack = [];
		}

		this._stack.push(nodeData);
	}

	navigateTo(uuid) {

		/**
		 * attempt to navigate using stack if possible
		 */

		var node = this._findNextNodePrefix(uuid, this._data);

		if (!node) {
			node = this._findNode(uuid, this._data);
		}

		if (!node) {
			node = this._findNodePrefix(uuid, this._data);
		}

		if (!node) {
			throw 'Unable to find node with uuid: ' + uuid;
		}

		this._element.innerHTML = ''; //would like a nicer way to clear
		this._executeOnNavigationExitLogic(this._stack[this._stack.length - 1], node);
		this._renderNode(node);

	}

	hasBack() {
		return this._stack && this._stack.length > 1;
	}

	back() {

		var current = this._stack.pop();


		var last = this._stack.pop();

		this._executeBackNavigationLogic(current, last);
		this._executeOnNavigationExitLogic(current, last);

		
		this._renderNode(last);

	}

	_renderNode(data, container) {

		if (!data) {
			throw 'Attempt to render null data';
		}

		this._push(data);


		this.setFormValue('visited_' + data.uuid, true);


		this._setSourceBase(data.name + '-' + data.uuid.substring(0, 5));

		this._resetContext();

		this._executeOnNavigationEntryLogic(data);

		container = container || this._element;

		var node = container.appendChild(new Element('main'));
		var heading=null;
		if (this._displayInfo) {

			heading=node.appendChild(new Element('h1', {
				"class": 'node-label',
				html: data.name
			}));
		}

		this._renderPagesNavigationForNode(data, 0, node, (set) => {

			if (data.nodes && data.nodes.length) {

				this._setNext(() => {

					this._update();

					node.parentNode.removeChild(node);
					if (this._displayInfo) {
						heading.parentNode.removeChild(heading);
					}

					var nextNode = data.nodes[0];

					var index = this._executeNavigationLogic(data);



					var handleIndex = (index) => {

						if (typeof index == 'number') {
							index = parseInt(index);
							nextNode = data.nodes[index];
						}

						if (typeof index == 'string') {

							nextNode = this._findNextNodePrefix(index, data) || this._findNode(index);
							if (!nextNode) {
								//Node returned null, reset for the next block
								nextNode = index;
							}
							//throw 'Not implemented: Navigation to node uuid';
						}

						if (typeof nextNode == 'string') {
							//Must use full uuid, no prefix!
							nextNode = this._findNode(nextNode);

							if (!nextNode) {
								throw 'Unable to find node with uuid/index: ' + index;
							}

							//throw 'Not implemented: Navigation to node uuid';
						}


						if (index instanceof Promise) {
							index.then(handleIndex);
							return;
						}


						this._executeOnNavigationExitLogic(data, nextNode);
						this._renderNode(nextNode);

					};

					handleIndex(index);

				});

				return new Element('button', {
					"class": "section-next",
					html: this.getLabelFor('nextNodeLabel', data, data.items[0], 'Next'),
					events: {
						click: (e) => {


							e.stopPropagation();
							e.preventDefault();
							this.next();


						}
					}
				});
			}
		}).then(() => {

			this.emit('renderedNode', data, node);

		});

		//TODO: remove this! 
		this.emit('renderNode', data, node);


	}



	_renderPagesNavigationForNode(data, i, container, complete) {

		var items = data.items;

		this._disableForward = false;
		delete this._validators;
		delete this._transforms;

		container = container || this._element;

		var set = container.appendChild(new Element('div'));

		return this._renderPage(items[i], set).then(() => {



			var nav = set.appendChild(new Element('nav'));

			if (i == 0 && this.hasBack()) {

				nav.appendChild(new Element('button', {
					html: this.getLabelFor('backLabel', data, items[i], 'Back'),
					"class": "section-back",
					events: {
						click: (e) => {

							e.stopPropagation();
							e.preventDefault();

							this._update();
							set.parentNode.removeChild(set);
							this.back();
						}
					}
				}))

			}


			if (i > 0) {

				nav.appendChild(new Element('button', {
					html: this.getLabelFor('backLabel', data, items[i], 'Back'),
					"class": "page-back",
					events: {
						click: (e) => {

							e.stopPropagation();
							e.preventDefault();

							this._update();
							set.parentNode.removeChild(set);
							this._renderPagesNavigationForNode(data, --i, container, complete);
						}
					}
				}))
			}

			if (i == items.length - 1) {

				if (typeof complete === 'function') {
					complete = complete();
				}

				if (!complete) {

					this._setNext(() => {

						this._update();
						set.parentNode.removeChild(set);

						/**
						 * Still want to execute navigation logic, user can implement submit fn here
						 */
						/*var index = */this._executeNavigationLogic(data);

						this.emit('complete');
						container.appendChild(new Element('h3', {
							"class": "complete-page",
							html: this._options.completePageHtml || "Complete! Thank you."
						}))

					});

					complete = new Element('button', {
						"class": "section-next section-complete",
						html: this.getLabelFor('completeLabel', data, items[i], 'Complete'),
						events: {
							click: (e) => {

								e.stopPropagation();
								e.preventDefault();
								this.next();

							}
						}
					});

				}



				this._setForwardBtn(complete);
				nav.appendChild(complete);

				return;
			}

			this._setForwardBtn(nav.appendChild(new Element('button', {
				html: this.getLabelFor('nextLabel', data, items[i], 'Next'),
				"class": "page-next",
				events: {
					click: (e) => {

						e.stopPropagation();

						this._update();
						set.parentNode.removeChild(set);
						this._renderPagesNavigationForNode(data, ++i, container, complete);
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




	async postFormData(url, options) {

		let opts = {
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
		};

		if (options) {
			Object.keys(options).forEach((o) => {
				opts[o] = options[o];
			});
		}


		const response = await fetch(url, opts);

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

	fetchFormTextValue(name, url, options) {

		var opts = {
			mode: "no-cors", // no-cors, *cors, same-origin
			cache: "no-cache",
			credentials: "omit",
		};

		if (options) {
			Object.keys(options).forEach((o) => {
				opts[o] = options[o];
			});
		}

		return fetch(url, opts).then((resp) => {

			return resp.text();

		}).then((value) => {

			this.setFormValue(name, value);

		}).catch(console.error)

	}

	fetchFormValue(name, url, options) {

		var opts = {
			mode: "no-cors", // no-cors, *cors, same-origin
			cache: "no-cache",
			credentials: "omit",
		};

		if (options) {
			Object.keys(options).forEach((o) => {
				opts[o] = options[o];
			});
		}

		return fetch(url, opts).then((resp) => {

			return resp.json();

		}).then((value) => {

			this.setFormValue(name, value);
			return value;

		}).catch(console.error)

	}

	fetchFormData(url, options) {

		var opts = {
			mode: "no-cors", // no-cors, *cors, same-origin
			cache: "no-cache",
			credentials: "omit",
		};

		if (options) {
			Object.keys(options).forEach((o) => {
				opts[o] = options[o];
			});
		}

		return fetch(url, opts).then((resp) => {

			return resp.json();

		}).then((value) => {

			this.setFormData(value);
			return value;

		}).catch(console.error)

	}


	setFormValue(name, value) {


		value = JSON.parse(JSON.stringify(value));

		this._formData[name] = value;

		this.emit('update');

	}

	unsetPageData(keys) {

		if (typeof keys == 'string') {
			keys = [keys];
		}

		keys.forEach((key) => {
			delete this._currentFormData()[key];
		});
		this.emit('update');

	}


	unsetFormValue(name) {


		delete this._formData[name];
		this.emit('update');

	}


	setPageData(obj, pageData) {

		pageData = pageData || this._currentFormData();

		obj = JSON.parse(JSON.stringify(obj));
		Object.keys(obj).forEach((name) => {
			pageData[name] = obj[name];
		});

		if (pageData === this._currentFormData()) {
			this.emit('update');
		}

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

		if(this._currentFormData()[name] === value){
			// skip update
			return;
		}

		this._currentFormData()[name] = value;
		this.emit('update');

	}


	updateFormValues(obj) {
		this.setPageData(obj);
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


	getSourceUrl(file) {


		var path = (this._sourceBase || "page") + "/" + (this._scriptIndex++) + '-' + (file || this._sourceFile) + ".js?"
		path = path.split(' ').join('');

		return '//# sourceURL=survey-runner://survey-items/scripts/' + path

	}

	_renderPage(data, container) {


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


			this.updateFormInputs(this._element);


			this._update();
			this.needsValidation();
			this.emit('renderSet', data);
			this.emit('renderPage', data);

		});


	}

	updateFormInputs(element) {

		var data = this.getPageData();
		Array.prototype.slice.call(element.querySelectorAll("*")).forEach((el) => {



			if (typeof el.name == 'string' && el.name != "" && typeof data[el.name] != 'undefined') {

				if (el.type === 'checkbox') {
					el.checked = data[el.name] === 'on';
					return;
				}

				if (el.type === 'radio') {
					el.checked = data[el.name] === el.value;
					return;
				}

				if (el.tagName === 'SELECT') {

					//carful not to set empty
					if (data[el.name] === '' && el.options[0].disabled) {
						el.options[0].selected = 'selected';
						return;
					}

				}

				el.value = data[el.name];
			}

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
		var target = this._formData;
		Object.keys(vars).forEach((k) => {
			original[k] = target[k];
			target[k] = vars[k];
		});

		var returnVar = cb();
		var reset=()=>{
			Object.keys(vars).forEach((k) => {
				if (typeof original[k] == 'undefined') {
					delete target[k];
					return;
				}
				target[k] = original[k];
			});
		}

		if(returnVar instanceof Promise){
			returnVar.then((v)=>{
				reset();
				return v;
			})
		}else{
			reset();
		}

		

		return returnVar;


	}

	withPageVariables(vars, cb) {

		var original = {}
		var target = this._currentFormData();
		Object.keys(vars).forEach((k) => {
			original[k] = target[k];
			target[k] = vars[k];
		});

		cb();

		Object.keys(vars).forEach((k) => {
			if (typeof original[k] == 'undefined') {
				delete target[k];
				return;
			}
			target[k] = original[k];
		});


	}

}
SurveyRenderer.Element = Element;

window.SurveyRenderer = SurveyRenderer;