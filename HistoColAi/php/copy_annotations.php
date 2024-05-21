<?php

$rootdir = "/histocolai";

error_reporting(E_ALL);
ini_set('display_errors', 'On');
include "base.php";

$connection=mysqli_connect($dbhost, $dbuser, $dbpass,$dbname) or die("MySQL Error 1: " . mysql_error());


// copy selected annotations from user_from to user_to
function copy_selected_annotations_from_to($p)
{
    if($p['option'] != 'copy_selected_annotations') {
        die('<h2>You are not allowed to do this operation.</h2>');
    }
	global $connection;
	global $dbname;
    
    $user_from = $p['user_from'];
    $user_to = $p['user_to'];
    $slices_to_copy = $p['slices_to_copy'];

    // select annotations of user 'user_from'
	$q="SELECT * FROM `KeyValue` WHERE `myTimestamp` "
	   ."IN (SELECT MAX(`myTimestamp`) FROM `KeyValue` "
	   ."WHERE `myUser`='$user_from' AND `finished`=1 "
	   ."GROUP BY `myOrigin`) AND `myUser`='$user_from' "
	   ."ORDER BY `UniqueID` ASC ";
	$result = mysqli_query($connection,$q);
	
    // for each of the annotations, insert it to 'user_to'
	while($row = mysqli_fetch_assoc($result)) {
        if(in_array($row['UniqueID'], $slices_to_copy)) {
            $q="INSERT INTO ".$dbname.".KeyValue (myTimestamp, myOrigin, "
            ."myKey, myValue, mySlice, mySliceName, mySource, myUser, finished) "
            ."VALUES('"
            .date('Y-m-d H:i:s')."','" 
            .str_replace($user_from, $user_to, $row["myOrigin"])."','"
            .$row["myKey"]."','"
            .$row["myValue"]."',"
            .$row["mySlice"].",'"
            .$row["mySliceName"]."','"
            .$row["mySource"]."','$user_to',1)";
            
            $result_in = mysqli_query($connection,$q);
            
            if($result_in) {
                echo '<span style="color: green;">'.$row['mySliceName'].'&nbsp;<b>Coppied!</b></span><br>';
            }else{
                echo '<span style="color: red;">'.$row['mySliceName'].'&nbsp;<b>Failed!</b></span><br>';
            }
        }

	}
    mysqli_free_result($result);
    
    echo '<a href="copy_annotations.php">Copy more annotations</a>';

}

// function that allows to choose which annotations are to be coppied
function choose_annotations_to_copy($p) {
    global $connection;
	global $dbname;
    $user_from = $p['user_from'];
    $user_to = $p['user_to'];

	// select annotations of user 'user_from'
	$q="SELECT * FROM `KeyValue` WHERE `myTimestamp` "
	   ."IN (SELECT MAX(`myTimestamp`) FROM `KeyValue` "
	   ."WHERE `myUser`='$user_from' AND `finished`=1 "
	   ."GROUP BY `myOrigin`) AND `myUser`='$user_from' "
	   ."ORDER BY `UniqueID` ASC ";
	$result = mysqli_query($connection,$q);
    
    // write form again to inform which users are we dealing with
    // copy_user_annotations_from_to($user_from, $user_to);
    echo '<h1>Copy annotations from user A to user B</h1>';
    echo '<form name="copy_annotations" id="copy_annotations" method="post" action="#">';
    echo 'Copy annotations from <strong>'.$p['user_from'].'</strong> to <strong>'.$p['user_to'].'</strong>';

    echo '<pre>';
    // for each of the annotations, insert it to 'user_to'
	while($row = mysqli_fetch_assoc($result)) {         
            $uid = $row['UniqueID'];
            $slice_id = $row['mySlice'];
            $slice_name = $row['mySliceName'];
            echo '<input type="checkbox" name="slices_to_copy[]" id="slices_to_copy[]" value="'.$uid.'" checked>'.$slice_id.': '.$slice_name.'<br>';

	}
    mysqli_free_result($result);
    
    // place button to copy
    echo '<br><input type="submit" name="copy" value="Copy selected annotations">';
    echo '&nbsp;<input type="button" name="button" value="Back" onclick="javascript: history.go(-1)">';
    echo '<input type="hidden" name="option" id="option" value="copy_selected_annotations">';
    echo '<input type="hidden" name="user_from" id="user_from" value="'.$user_from.'">';
    echo '<input type="hidden" name="user_to" id="user_to" value="'.$user_to.'">';
    echo '</form>';

}

// write a listbox with the list of registered users
function write_list_of_users($field_name)
{
	global $connection;
	global $dbname;
	
	// get a list of registered users
	$q="SELECT `Username` FROM `Users`";
	$result = mysqli_query($connection,$q);
    
    // write the list
    $text = '<select name="'.$field_name.'" id="'.$field_name.'">';
	while($row = mysqli_fetch_assoc($result)) {
        if($field_name=='user_from' || $row['Username'] != 'masales') {
            $text .= '<option>'.$row['Username'].'</option>';
        }
    }
    $text .= '</select>';
    mysqli_free_result($result);
    
    return $text;

}

function write_form_copy()
{
    echo '<h1>Copy annotations from user A to user B</h1>';
    echo '<form name="copy_annotations" id="copy_annotations" method="post" action="#">';
    echo 'Copy annotations from '.write_list_of_users('user_from');
    echo ' to '.write_list_of_users('user_to');
    echo '&nbsp;<input type="submit" name="copy" value="Copy annotations">';
    echo '<input type="hidden" name="option" id="option" value="choose_annotations">';
    echo '</form>';
}



// check which option has been chosen
if(isset($_POST['option'])) {
    switch($_POST['option']) {

        case 'choose_annotations':
        choose_annotations_to_copy($_POST);
        break;

        case 'copy_selected_annotations':
        copy_selected_annotations_from_to($_POST);
        break;

    }
}else{
    write_form_copy();
}


?>
