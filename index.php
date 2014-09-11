<?php
if(isset($_GET['debug']))
{
	echo file_get_contents('./ArgenmapLiveGraph.js');
}else{
	echo file_get_contents('./ArgenmapLiveGraph.js');
}
exit();