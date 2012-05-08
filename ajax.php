<?php
    header('Content-Type: application/json');

    $mode = empty($_REQUEST['mode']) ? false : $_REQUEST['mode'];
    if(empty($mode)){
        error();
    }

    if($mode == 'day'){
        $day = !isset($_REQUEST['day']) ? false : $_REQUEST['day'];
        if($day===false){
            error();
        }
        $data = unserialize(file_get_contents('data.inc'));

        if(empty($data[$day])){
            error();
        }
        echo json_encode($data[$day]);
        exit;
        
    }else if($mode=='full'){
        $id = empty($_REQUEST['id']) ? false : $_REQUEST['id'];
        if(empty($id)){
            error();
        }
        $db = mysql_connect('localhost', 'helpermonkey', 'burnface');
        mysql_select_db('cruise', $db);
        $query = "SELECT * FROM photos WHERE photoid='".mysql_real_escape_string($id)."'";
        $result = mysql_query($query, $db);
        if(mysql_num_rows($result)==0){
            error();
        }
        $photo = mysql_fetch_array($result, true); 
        $payload = array(
            'img'=>$photo['largeurl'],
            'pageurl'=>$photo['pageurl'],
            'username'=>$photo['username'],
            'userurl'=>'http://www.flickr.com/photos/'.$photo['userid'].'/',
            'title'=>$photo['title'],
            'orientation'=>$photo['orientation']
        );
        echo json_encode($payload);
        exit;
    }

    error();

    function error(){
        echo "false";
        exit;
    }

?>
