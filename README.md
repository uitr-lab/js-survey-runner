# js-survey-runner 

Render forms and surveys with javascript from json definition

You can create a form/survey json definition, using the builder user interface at https://survey.uitrlab.ok.ubc.ca/survey-tool-demo/


## Simple usage

```html

<script src="dist/form.js"></script>
<script type="text/javascript">

(function(){ 

   document.body.appendChild((new SurveyRenderer()).render("rsvp.json"));

})();

</script>

```