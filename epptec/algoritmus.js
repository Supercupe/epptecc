//postup v případě filtrace a vytvoření nové array
let prvky = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let pravidla = ["prvek > 5", "prvek < 7"];

function main_create(prvky, pravidla){
    return prvky.filter(prvek=>{
        return pravidla.every(pravidlo=> eval(pravidlo));
    });
}

let filtrovanePrvky = main_create(prvky, pravidla);
console.log("Vytvořená nová množina s filtrovanými prvky - "+filtrovanePrvky);

// Postup v případě mazání prvků z originálního seznamu
function main_delete(prvky, pravidla) {
    for (let i = prvky.length - 1; i >= 0; i--) {
        let prvek = prvky[i];
        if (!pravidla.every(pravidlo => eval(pravidlo))) {
            prvky.splice(i, 1); 
        }
    }
    return prvky;
}
main_delete(prvky, pravidla);
console.log("Smazané prvky z originálního seznamu - " + prvky);

//Postup v případě použití objektového seznamu
let seznam = {
    numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    rules: ["prvek > 5", "prvek < 7"],
};


let filtrovanePrvkyObj = main_create(seznam.numbers, seznam.rules);

console.log("Postup v případě objektu - "+filtrovanePrvkyObj);