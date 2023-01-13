import {
	SurveyRunner
} from './SurveyRunner.js'

import {
	Element
} from './Element.js'


import {
	marked
} from 'marked'


import Twig from 'twig';






SurveyRenderer.addItem('markdown', (item, container, renderer) => {


	var template = Twig.twig({
	    data: item.text
	});

	
	var markdown=template.render(renderer.getFormData()||{});
	

	var content = marked.parse(markdown);
	container.appendChild(new Element('span', {
		html: content
	}));


});


SurveyRenderer.addItem('textfield', (item, container) => {

	var label = null;

	if (item.label) {
		label = container.appendChild(new Element('label', {
			html: item.label
		}));

	}


	var input = (label || container).appendChild(new Element('input', {
		type: "text",
		name: item.fieldName,
	}));

	if (item.placeholder) {
		input.setAttribute('placeholder', item.placeholder);
	}


});


SurveyRenderer.addItem('checkbox', (item, container, renderer) => {


	if(item.label){

		container=container.appendChild(new Element('label', {
			html: item.label
		}));

	}


	var checkbox=container.appendChild(new Element('input', {
		type:"checkbox",
		checked:!!item.checked,
		name:item.fieldName
	}));

	checkbox.addEventListener('change',()=>{
		if(!checkbox.checked){
			renderer.setFormValue(item.fieldName, "off");
		}
	});


});

SurveyRenderer.addItem('radio', (item, container) => {


	if(item.label){

		container=container.appendChild(new Element('label', {
			html: item.label
		}));

	}



	var values=(item.values||['a', 'b', 'c']);

	var labels=null;

	if(typeof values=='string'){

		if(values[0]=='['){
			
			values=JSON.parse(values);
		
		}else if(values[0]=='{'){
			
			var obj=JSON.parse(values);
			values=Object.keys(obj);
			labels=[];
			values.forEach((v)=>{
				labels.push(obj[v]);
			});


		}else{

			values=values.split(',').map((v)=>{
				return v.trim();
			});


		}

	}

	labels=labels||(item.labels||values);


	if(typeof labels=='string'){

		if(labels[0]=='['){
			
			labels=JSON.parse(labels);
		
		}else{

			labels=labels.split(',').map((l)=>{
				return l.trim();
			});


		}

	}



	values.forEach((v, index)=>{




		var radio = container.appendChild(new Element('label', {
			"for":v,
			html:labels[index]
		}));

		 radio.appendChild(new Element('input',{
				type:'radio',
				value:v,
				name:item.fieldName
			}))

	})


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