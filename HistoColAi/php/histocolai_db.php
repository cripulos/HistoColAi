<?php

$rootdir = "/HistoColAi";

error_reporting(E_ALL);
ini_set('display_errors', 'On');

//echo $_SERVER['DOCUMENT_ROOT'].$rootdir."/php/base.php";

include $_SERVER['DOCUMENT_ROOT'].$rootdir."/php/base.php";

$connection=mysqli_connect($dbhost, $dbuser, $dbpass,$dbname) or die("MySQL Error 1: " . mysql_error());

if(isset($_GET["action"])) $action=$_GET;
if(isset($_POST["action"])) $action=$_POST;

switch($action["action"])
{
	case "save":
		save($action);
		break;
	case "load":
		load($action);
		break;
	case "load_last":
		loadLast($action);
		break;
	case "remote_address":
		remote_address();
		break;
	case "save_label":
		saveLabel($action);
		break;
	case "load_label":
		loadLabel($action);
		break;
	case "conviction":
		saveConviction($action);
		break;
	case "load_conviction":
		loadConviction($action);
		break;
	case "save_slice_time":
		saveSliceTime($action);
		break;
	case "check_time":
		checkTime($action);
		break;
	case "save_batch_time":
		saveBatchTime($action);
		break;
}

function save($args)
{
	global $connection;
	global $dbname;
	global $rootdir;

	header("Access-Control-Allow-Origin: *");

	$origin = json_decode($args['origin']);
	$slice = $origin->slice;
	$source = str_replace('images/', '', $origin->source);
	$user = (is_string($origin->user) == true) ? $origin->user : $origin->user->IP;
	$finished = (strcmp($args['finished'], 'true') == 0) ? 1 : 0;

	$value = json_decode($args['value']);
	$sliceName = str_replace($_SERVER['DOCUMENT_ROOT'].$rootdir.'/images/', '', $value->filename);
	$q="INSERT INTO ".$dbname.".KeyValue (myOrigin, myKey, myValue, mySlice, mySliceName, mySource, myUser, finished) VALUES('"
		.$args["origin"]."','"
		.$args["key"]."','"
		.mysqli_real_escape_string($connection,$args["value"])."',"
		.$slice.",'"
		.mysqli_real_escape_string($connection,$sliceName)."','"
		.mysqli_real_escape_string($connection,$source)."','"
		.mysqli_real_escape_string($connection,$user)."',"
		.mysqli_real_escape_string($connection,$finished).")";
	$result = mysqli_query($connection,$q);

	header('Content-Type: application/json');
	if($result) {
		$response["result"]="success";
	} else {
		$response["result"]="error";
		$response["description"]=mysqli_error($connection);
	}
	echo json_encode($response);
}

function load($args)
{
	global $connection;
	global $dbname;
	$arr=array();

	header("Access-Control-Allow-Origin: *");

	$q="SELECT * FROM ".$dbname.".KeyValue WHERE "
		." myOrigin = '".$args["origin"]."' AND"
		." myKey = '".$args["key"]."'";
	$result = mysqli_query($connection,$q);

	while($row = mysqli_fetch_assoc($result)) {
		if($row["myValue"])
		{
			array_push($arr,$row);
		}
	}

	header('Content-Type: application/text');
	echo json_encode($arr);

	mysqli_free_result($result);
}

function loadLast($args)
{
	global $connection;
	global $dbname;

	header("Access-Control-Allow-Origin: *");

	$q="SELECT * FROM ".$dbname.".KeyValue WHERE "
		." myOrigin = '".$args["origin"]."' AND"
		." myKey = '".$args["key"]."'"
		." ORDER BY myTimestamp DESC LIMIT 1";
  //echo $q ;
	$result = mysqli_query($connection,$q);
	if(mysqli_num_rows($result)>0) {
		header('Content-Type: application/text');
		$row = mysqli_fetch_assoc($result);
		echo json_encode($row);
	}
	mysqli_free_result($result);

}

function remote_address()
{
	header("Access-Control-Allow-Origin: *");

	echo $_SERVER['REMOTE_ADDR'];
		if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
		header('Access-Control-Allow-Methods: GET, POST, DELETE');
		header('Access-Control-Allow-Headers: Authorization');
		http_response_code(204);
	}
}

function saveLabel($args)
{
	global $connection;
	global $dbname;
	global $rootdir;

	header("Access-Control-Allow-Origin: *");

	$origin = json_decode($args['origin']);
	$slice = $origin->slice;
	$user = (is_string($origin->user) == true) ? $origin->user : $origin->user->IP;
	$label = $origin->label;
	$observation = $origin->observation;

	/*
		Primero comprubo si exite ya en la BD un registro con un usario y una slide igual
	*/
	$q_ask="SELECT 'UniqueID' FROM ".$dbname.".LabelObservation WHERE MyUser LIKE '".$user."' AND MySliceName LIKE '".$slice."'";
	$result = mysqli_query($connection,$q_ask);
	$fila =mysqli_fetch_row($result);

	/*
		Si no exite el registro se crea realizando una consulta Insert into
	*/
	if(empty($fila)){

		$q="INSERT INTO ".$dbname.".LabelObservation (MyUser, MySliceName, Observation, Label) VALUES('"
			.$user."','"
			.$slice."','"
			.$observation."','"
			.$label."')";

			$result = mysqli_query($connection,$q);

			header('Content-Type: application/json');
			if($result) {
				$response["result"]="success";
			} else {
				$response["result"]="error";
				$response["description"]=mysqli_error($connection);
			}
			echo json_encode($response);
	}
	/*
		Si exite se actualiza los campos label y observation
	*/
	else {

		$q="UPDATE " .$dbname.".LabelObservation SET Observation='".$observation."', Label='".$label."' WHERE MyUser LIKE '".$user."' AND
		MySliceName='".$slice."'";

			$result = mysqli_query($connection,$q);

			header('Content-Type: application/json');
			if($result) {
				$response["result"]="success";
			} else {
				$response["result"]="error";
				$response["description"]=mysqli_error($connection);
			}
			echo json_encode($response);
	}
}

function loadLabel($args)
{
	global $connection;
	global $dbname;
	global $rootdir;

	header("Access-Control-Allow-Origin: *");

	$origin = json_decode($args['origin']);
	$slice = $origin->slice;
	$user = (is_string($origin->user) == true) ? $origin->user : $origin->user->IP;

	$q="SELECT Observation, Label FROM ".$dbname.".LabelObservation WHERE MyUser LIKE '".$user."' AND MySliceName LIKE '".$slice."'";

	$result = mysqli_query($connection,$q);

	if(mysqli_num_rows($result)>0) {
		header('Content-Type: application/text');
		$row = mysqli_fetch_assoc($result);
		echo json_encode($row);
	}
	mysqli_free_result($result);

}

function saveConviction($args)
{
	global $connection;
	global $dbname;
	global $rootdir;

	header("Access-Control-Allow-Origin: *");

	$origin = json_decode($args['origin']);
	$slice = $origin->slice;
	$user = (is_string($origin->user) == true) ? $origin->user : $origin->user->IP;
	$observation = $origin->observation;

	/*
		Primero comprubo si exite ya en la BD un registro con un usario y una slide igual
	*/
	$q_ask="SELECT 'UniqueID' FROM ".$dbname.".conviction WHERE MyUser LIKE '".$user."' AND MySliceName LIKE '".$slice."'";
	$result = mysqli_query($connection,$q_ask);
	$fila =mysqli_fetch_row($result);

	/*
		Si no exite el registro se crea realizando una consulta Insert into
	*/
	if(empty($fila)){
		$q="INSERT INTO ".$dbname.".conviction (MyUser, MySliceName, Conviction) VALUES('"
			.$user."','"
			.$slice."','"
			.$observation."')";

			$result = mysqli_query($connection,$q);

			header('Content-Type: application/json');
			if($result) {
				$response["result"]="success";
			} else {
				$response["result"]="error";
				$response["description"]=mysqli_error($connection);
			}
			echo json_encode($response);
	}
	/*
		Si exite se actualiza los campos label y observation
	*/
	else {
		$q="UPDATE " .$dbname.".conviction SET conviction='".$observation."' WHERE MyUser LIKE '".$user."' AND
		MySliceName='".$slice."'";

			$result = mysqli_query($connection,$q);

			header('Content-Type: application/json');
			if($result) {
				$response["result"]="success";
			} else {
				$response["result"]="error";
				$response["description"]=mysqli_error($connection);
			}
			echo json_encode($response);
	}
}

function loadConviction($args)
{
	global $connection;
	global $dbname;
	global $rootdir;

	header("Access-Control-Allow-Origin: *");

	$origin = json_decode($args['origin']);
	$slice = $origin->slice;
	$user = (is_string($origin->user) == true) ? $origin->user : $origin->user->IP;

	$q="SELECT conviction FROM ".$dbname.".conviction WHERE MyUser LIKE '".$user."' AND MySliceName = '".$slice."'";

	$result = mysqli_query($connection,$q);

	if(mysqli_num_rows($result)>0) {
		header('Content-Type: application/text');
		$row = mysqli_fetch_assoc($result);
		echo json_encode($row);
	}else{
		$response["result"]="error";
		$response["description"]=mysqli_error($connection);
	}
	mysqli_free_result($result);

}

function saveSliceTime($args)
{
	global $connection;
	global $dbname;
	global $rootdir;

	header("Access-Control-Allow-Origin: *");

	$origin = json_decode($args['origin']);
	$user = (is_string($origin->user) == true) ? $origin->user : $origin->user->IP;
	$slice = $origin->slice;	
	$source = str_replace('images/', '', $origin->source);
	$time = $origin->time;

	$q_ask = "SELECT TotalTime FROM ".$dbname.".Annotation_time WHERE 
	ID_batch=(SELECT ID FROM histocolai.Batch_time Where Username='".$user."' and BatchName='".$source."' ORDER BY histocolai.Batch_time.ID ASC Limit 1) AND
	Slice=".$slice." order by myTimeStamp DESC LIMIT 1";

	$result = mysqli_query($connection,$q_ask);

	$fila = mysqli_fetch_assoc($result);

	if(!empty($fila))
	{
		$totalTime = $time+$fila["TotalTime"];

		$q="INSERT INTO ".$dbname.".Annotation_time (ID_batch, IDannotation, Slice, Time, TotalTime, myTimestamp)
		VALUES ((SELECT ID FROM histocolai.Batch_time Where Username='".$user."' and BatchName='".$source."' ORDER BY myTimestamp ASC Limit 1),
		(SELECT UniqueID FROM KeyValue Where myUser='".$user."'and mySource='".$source."'and mySlice=".$slice." ORDER BY myTimestamp DESC Limit 1),
		".$slice.",".$time.",".$totalTime.", now()+1)";
		
		$result = mysqli_query($connection,$q);

		header('Content-Type: application/json');
		if($result) {
			$response["result"]="success";
		} else {
			$response["result"]="error";
			$response["description"]=mysqli_error($connection);
		}
		echo json_encode($response);

	}
	else
	{
		$q="INSERT INTO ".$dbname.".Annotation_time (ID_batch, IDannotation, Slice, Time, TotalTime, myTimestamp)
		VALUES ((SELECT ID FROM histocolai.Batch_time Where Username='".$user."' and BatchName='".$source."' ORDER BY ID Limit 1),
		(SELECT UniqueID FROM KeyValue Where myUser='".$user."'and mySource='".$source."'and mySlice=".$slice." ORDER BY UniqueID Limit 1),
		".$slice.",".$time.",".$time.", now())";

		$result = mysqli_query($connection,$q);

		header('Content-Type: application/json');
		if($result) {
			$response["result"]="success";
		} else {
			$response["result"]="error";
			$response["description"]=mysqli_error($connection);
		}
		echo json_encode($response);
	}

}

function saveBatchTime($args){
	global $connection;
	global $dbname;
	global $rootdir;

	header("Access-Control-Allow-Origin: *");

	$origin = json_decode($args['origin']);
	$user = (is_string($origin->user) == true) ? $origin->user : $origin->user->IP;	
	$source = str_replace('images/', '', $origin->source);
	$time = $origin->time;

	$q_ask = "SELECT TotalTime, UserID FROM ".$dbname.".Batch_time WHERE 
	UserName='".$user."' and BatchName='".$source."' ORDER BY myTimestamp DESC Limit 1";

	$result = mysqli_query($connection,$q_ask);
	$fila = mysqli_fetch_assoc($result);
	

	if(!empty($fila))
	{
		$totalTime = $time+$fila["TotalTime"];

		$q="INSERT INTO ".$dbname.".Batch_time (BatchName, UserName, UserID, Time, TotalTime, myTimestamp)
		VALUES ('".$source."','".$user."',".$fila["UserID"].",".$time.",".$totalTime.", now())";
		$result = mysqli_query($connection,$q);

		header('Content-Type: application/json');
		if($result) {
			$response["result"]="success";
		} else {
			$response["result"]="error";
			$response["description"]=mysqli_error($connection);
		}
		echo json_encode($response);

	}
	else
	{
		$q="INSERT INTO ".$dbname.".Batch_time (BatchName, UserName, UserID, Time, TotalTime, myTimestamp)
		VALUES ('".$source."','".$user."',(SELECT UserID FROM histocolai.Users Where Username='".$user."'),".$time.",".$time.", now())";

		$result = mysqli_query($connection,$q);

		header('Content-Type: application/json');
		if($result) {
			$response["result"]="success";
		} else {
			$response["result"]="error";
			$response["description"]=mysqli_error($connection);
		}
		echo json_encode($response);
	}

}

function checkTime($args){

	global $connection;
	global $dbname;
	global $rootdir;

	header("Access-Control-Allow-Origin: *");

	$origin = json_decode($args['origin']);
	$user = (is_string($origin->user) == true) ? $origin->user : $origin->user->IP;
	$slice = $origin->slice;	
	$source = str_replace('images/', '', $origin->source);
	$time = $origin->time;

	$q_ask = "SELECT TotalTime, myTimeStamp FROM ".$dbname.".Annotation_time WHERE 
		ID_batch=(SELECT ID FROM histocolai.Batch_time Where Username='".$user."' and BatchName='".$source."' ORDER BY ID Limit 1) AND
		Slice=".$slice." order by myTimeStamp DESC LIMIT 1";

	$result = mysqli_query($connection,$q_ask);

	if(!empty($result) AND mysqli_num_rows($result) > 0) {
		header('Content-Type: application/text');
		$row = mysqli_fetch_assoc($result);
		echo $row["TotalTime"];
	}else{
		$response["result"]="error";
		$response["description"]=mysqli_error($connection);
	}
	mysqli_free_result($result);


}

?>
