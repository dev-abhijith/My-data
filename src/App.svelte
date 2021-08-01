<script>
  import Table from "./Table.svelte";
  import File from "./File.svelte"
  import Data from "./Data.svelte"
  import {data} from "./fileStore"

  let questions = ''
	function updateTable(event){
		questions = data
	}
	
</script>


<main>
	
  	<div class="row">
    	<div class="col" >
    		<File on:notify="{updateTable}" />
			 <div class="row">
				 <Data on:notify="{updateTable}"/>
			 </div>
    	</div>
		<div class="col" id="table">
			<Table questionData={questions}/>
		</div>
	  </div>
	
</main>
 
