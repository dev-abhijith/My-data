<script>
    import {data} from "./fileStore"
    // import Papa from 'papaparse'


    import { createEventDispatcher } from 'svelte';



	const dispatch = createEventDispatcher();
    
    let exams = ['','CGL', 'CHSL', 'MTS']
    let subjects = ['','ra', 'ga','quant','eng']
    let years = ['',2021,2020,2019,2018,2017,2016,2015]
    let sections = []
    let quantSections = [
        '','Time&Work','Pipe&Cistern','Time&Distance','Boat&Stream','Percentage','Profit&Loss',
        'Mixture&Allegation','Ratio&Proportion','Partnership','Average','CompoundInterest','SimpleInterest',
        'NumberSystem&Algebra','HCF&LCM','Geometry','CooradinateGeometry','Mensuration','Trigonometry','Height&Distance','DataInterpretation'
    ]
    let raSections = ['',]
    let gaSections = ['','History','Geography','Biology','Economics','Polity','Physics','Computer','Chemistry']
    let engSections = ['','Errors','SentenceImprovement','Active&Passive','Direct&Indirect','FillInTheBlanks','Synonyms&Antonyms','OneWord','Idioms&Phrases','WordCorrection','Jumbled','Comprehension']

    let image_present = false
    let name_generated = false
    let exam=''
    let year=''
    let subject=''
    let section =''
    let question =''
    let answer =''
    let option1 =''
    let option2 =''
    let option3 =''
    let solution =''
    let image = 'none'

    const random = (length = 8) => {
    return Math.random().toString(16).substr(2, length);
    };

    function addQuestion(){
        if(image_present){
            image = 'img-'  + exam +'-' + year + '-' + subject + '-' + section + '-' +  random()
        }else{
            image = 'none'
        }
        let que = {
            exam,year,subject,section,question,answer,option1,option2,option3,solution,image
        }
        data.unshift(que)
        console.log(data)
        name_generated = false
        question = ''
        answer = ''
        option1 = ''
        option2 = ''
        option3 = ''
        solution = ''
        image = 'none'
        image_present = false
        dispatch('notify', 'updated')
    }

    function copy(){
        if(!name_generated){
        image =  'img-'  + exam +'_' + year + '_' + subject + '_' + section + '_' +  random()
        navigator.clipboard.writeText(image)
            .then(() => {
              
            })
            .catch(err => {
              alert('Error in copying text: ', err);
            });
            name_generated = true
        }else{
            alert('Already generated and copied')
        }
    }

    // function convertToCsv(){
    //     let csv = Papa.unparse(data)
    //     return csv
    // }

    function convertToCsv(){
        const items = data
        const replacer = (key, value) => value === null ? '' : value 
        const header = Object.keys(items[0])
        const csv = [
        header.join(','), // header row first
        ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
        ].join('\r\n')
        console.log(csv)
        return csv
    }

    function download() {
        let filename = "questions_"+ exam +'_' + year + '_' + subject + '_' + section+'.csv'
        let textInput = convertToCsv()
        let element = document.createElement('a');
        element.setAttribute('href','data:text/plain;charset=utf-8,' + encodeURIComponent(textInput));
        element.setAttribute('download', filename);
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
// ['','ra', 'ga','quant','eng']
    
    function setSection(){
        if (subject == 'quant'){
            return sections = quantSections
        }else if(subject == 'ra'){
            return sections = raSections
        }else if(subject == 'ga'){
            return sections = gaSections
        }else if(subject == 'eng'){
            return sections = engSections
        }
    }

</script>




<div>
    <div class="input-group input-group-sm mb-3">
        <select class="form-select" aria-label="Default select example" bind:value="{exam}" >
            {#each exams as examName}
            <option value={examName}>{examName}</option>
            {/each}
        </select>
        <!-- <input type="text" class="form-control" placeholder="Exam Name"  aria-label="Username" bind:value="{exam}" > -->
        <span class="input-group-text">Exam and Year</span>
        <select class="form-select" aria-label="Default select example" bind:value="{year}" >
            {#each years as examYear}
            <option value={examYear}>{examYear}</option>
            {/each}
        </select>
        <!-- <input type="text" class="form-control" placeholder="Year" aria-label="Server" bind:value="{year}"> -->
    </div>
    <div class="input-group input-group-sm mb-3 ">
        <select class="form-select" aria-label="Default select example" bind:value="{subject}" >
            {#each subjects as examSubject}
            <option value={examSubject}>{examSubject}</option>
            {/each}
        </select>
        <!-- <input type="text" class="form-control" placeholder="Subject" aria-label="Username" bind:value="{subject}"> -->
        <span class="input-group-text">Subject and Section</span>
        <select class="form-select" aria-label="Default select example" on:click="{setSection}" bind:value="{section}" >
            {#each sections as subjectSection}
            <option value={subjectSection}>{subjectSection}</option>
            {/each}
        </select>
        <!-- <input type="text" class="form-control" placeholder="Section" aria-label="Server" bind:value="{section}"> -->
    </div>
    <div class="input-group">
        <span class="input-group-text">Question</span>
        <textarea class="form-control" aria-label="With textarea" bind:value="{question}"></textarea>
    </div>
    <div class="options">
        <div class="input-group input-group-sm mb-3">
            <span class="input-group-text" id="inputGroup-sizing-sm">Answer</span>
            <input type="text" placeholder="Answer" class="form-control" aria-label="Sizing example input" aria-describedby="inputGroup-sizing-sm" bind:value="{answer}">
        </div>
        <div class="input-group input-group-sm mb-3">
            <span class="input-group-text" id="inputGroup-sizing-sm">Option 1</span>
            <input type="text" placeholder="Option 1" class="form-control" aria-label="Sizing example input" aria-describedby="inputGroup-sizing-sm" bind:value="{option1}">
        </div>
        <div class="input-group input-group-sm mb-3">
            <span class="input-group-text" id="inputGroup-sizing-sm">Option 2</span>
            <input type="text" placeholder="Option 2" class="form-control" aria-label="Sizing example input" aria-describedby="inputGroup-sizing-sm" bind:value="{option2}">
        </div>
        <div class="input-group input-group-sm mb-3 ">
            <span class="input-group-text" id="inputGroup-sizing-sm">Option 3</span>
            <input type="text" placeholder="Option 3" class="form-control" aria-label="Sizing example input" aria-describedby="inputGroup-sizing-sm" bind:value="{option3}">
        </div>
        <div class="input-group input-group-sm mb-3 ">
            <span class="input-group-text" id="inputGroup-sizing-sm">Solution</span>
            <input type="text" placeholder="Solution" class="form-control" aria-label="Sizing example input" aria-describedby="inputGroup-sizing-sm" bind:value="{solution}">
        </div>

        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault" bind:checked="{image_present}">
            <label class="form-check-label" for="flexCheckDefault">
               Tick here if the question has an image
            </label>
        </div>    
        {#if image_present}                    
            <div class="input-group input-group-sm mb-3 ">
                <span class="input-group-text" id="inputGroup-sizing-sm">Image Name</span>
                <input type="text" class="form-control" aria-label="Sizing example input" id="copy-button" bind:value="{image}" aria-describedby="inputGroup-sizing-sm" disabled>
                <span class="input-group-text pointer cpy" id="inputGroup-sizing-sm " on:click={copy} disabled="{name_generated}">Generate & copy Image name</span>
            </div>
        {/if}    
            
        <div class="right">
            <button type="button" class="button btn btn-success btn-sm " 
            on:click="{
            (question && answer && option1 && option2 && option3 && subject )? addQuestion():
            alert("Fill in the required information")
            }"

            >
                Add question
            </button>


            <button type="button" class="button btn btn-primary btn-sm " id="dwn-btn" on:click="{download}" >Export .csv</button>

        </div>
    </div>
</div>

<style>
    select{
        margin: 0px !important;
    }
    .input-group .form-control {
        margin: 0px !important;
    }
    .options{
        margin-top: 16px;
    }
    
    .pointer:hover{
        cursor: pointer;
    }

    .cpy:hover{
        background-color: #a7beea;
    }
    .right{
        display: flex;
        justify-content: right;
        
    }
    #copy-button{
        color: black;
    }
    .button{
        margin: 10px;
    }
</style>