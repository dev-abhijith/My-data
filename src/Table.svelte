<script>
import { flip } from 'svelte/animate';

export let questionData
</script>


<div class="table-section">
    <table class="table table-hover">
  <thead>
    <tr>
      
      <th scope="col">Exam</th>
      <th scope="col">Year</th>
      <th scope="col">Subject</th>
      <th scope="col">Section</th>
      <th scope="col">Question</th>
      <th scope="col">Answer</th>
      <th scope="col">Option1</th>
      <th scope="col">Option2</th>
      <th scope="col">Option3</th>
      <th scope="col">Solution</th>
      <th scope="col">Image</th>
    </tr>
  </thead>
  <tbody>
    {#each questionData as question, index(question) }
        <tr animate:flip >       
        <td>{question.exam}</td>
        <td>{question.year}</td>
        <td>{question.subject}</td>
        <td>{question.section}</td>
        <td>{question.question}</td>
        <td>{question.answer}</td>
        <td>{question.option1}</td>
        <td>{question.option2}</td>
        <td>{question.option3}</td>
        <td>{question.solution}</td>
        <td>{question.image}</td>
        </tr>
    {/each}
  </tbody>
</table>
</div>

<style>
    .table{
      font-size: 10px;
      margin: 0px;
    }
    table th{
      width: auto !important;
    }
    .table-section{
      max-height: 100vh;
      overflow-y: auto;
    }
   
</style>