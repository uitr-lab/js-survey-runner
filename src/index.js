import {
	SurveyRunner
} from './SurveyRunner.js'

import {
	Element
} from './Element.js'


import {
	marked
} from 'marked'






SurveyRenderer.addItem('markdown', (item, container) => {


	var content = marked.parse(item.text);
	container.appendChild(new Element('span', {
		html: content
	}));


})


SurveyRenderer.addItem('textfield', (item, container) => {

	var label = null;

	if (item.label) {
		label = container.appendChild(new Element('label', {
			html: item.label
		}));

	}


	var input = (label || container).appendChild(new Element('input', {
		type: "text",
		name: item.fieldValue,
	}));

	if (item.placeholder) {
		input.setAttribute('placeholder', item.placeholder);
	}


});


SurveyRenderer.addItem('label', (item, container) => {


	container.appendChild(new Element('label', {
		html: item.text
	}));


});

SurveyRenderer.addItem('fieldset', (item, container, renderer) => {


	var fieldset=container.appendChild(new Element('fieldset', {

	}));

	if(item.legend){
		field.appendChild(new Element('legend', {
			html:item.legend
		}));
	}

	(item.items||[]).forEach((item)=>{

		renderer.renderItem(item, fieldset);

	});



});