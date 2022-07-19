function findPriority(essen,total){
    console.log("essen : " + essen +  "total : " + total);
    let num3= (essen/total)*100
    if(Math.ceil(num3) < 10){
        return Math.ceil(num3);
    }
    let x = Math.ceil((num3/10));
    return x;
}

module.exports= findPriority

