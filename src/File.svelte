<script>
    import {data} from './fileStore'
    import Papa from 'papaparse'
    import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();


    function readFile(){
        const file = document.getElementById('formFile').files[0];
        Papa.parse(file, {
            delimiter:",",
            skipEmptyLines:true,
            header:true,
            complete: results => {
                results.data.forEach( (e) => data.push(e) )
                dispatch('notify', 'updated')
            }
            
        })
        console.log(data)
        
    }

</script>

<div>
    <div class="mb-3 import">
        <div class="text-left">
        <input class="form-control" type="file" id="formFile" 
        on:change="{readFile}">
        </div>
        <div class="text-right">
        <!-- <button type="button" class="btn btn-outline-primary btn-sm" >Import .CSV file</button> -->
        </div>
    </div>
    
    <hr/>
</div>

<style>
    .form-control{
        font-size: small;
    }
    .import{
        display: flex;
        justify-content: space-between;
    }

</style>