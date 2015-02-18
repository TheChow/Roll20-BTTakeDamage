var BTTakeDamage = BTTakeDamage || (function() {

    function hitMech(loc, dam, gameInfo) {
        loc = loc.toLowerCase();
        gameInfo.mechName = getAttrByName(gameInfo.characterId, "mech_name");
        //log ("[BTTakeDamage] loc: " + loc + " dam: " + dam + " gameInfo: " + JSON.stringify(gameInfo));
        hitArmor(loc, dam, gameInfo);
    }

    function hitInternal(loc, dam, gameInfo) {
        //if (loc.length === 3) 
        //    loc = loc.substr(0,2);

        var locAttr = findObjs({
            _characterid: gameInfo.characterId,
            _type: "attribute",
          name: _attributeMap[loc.length === 3 ? loc.substr(0,2) : loc] + "_internalstructure",
        })[0];
        
        var currInternal = locAttr.get("current");
        var cascadeLoc;
        if (currInternal === 0) {
            if (loc === 'ct' || loc === 'hd') {
                gameInfo.msg = buildMessageString(gameInfo.msg) + gameInfo.mechName + 
                    " has already been destroyed.";
                return;
            }
            cascadeLoc = _cascadeMap[loc];
            gameInfo.msg = buildMessageString(gameInfo.msg) + gameInfo.mechName + 
                " has nothing at " + loc.toUpperCase() + ", damage cascades to " + cascadeLoc.toUpperCase() + ".";
            return hitArmor(cascadeLoc, dam, gameInfo);
        } 
        
        if (parseInt(dam) <= parseInt(currInternal)) {
            locAttr.set("current", locAttr.get("current") - dam);
            gameInfo.msg = buildMessageString(gameInfo.msg) + gameInfo.mechName + 
                " internal structure at " + loc.toUpperCase() + " took " + dam + " damage.";
        }        
        else {
            cascadeLoc = _cascadeMap[loc];
            var newDam = dam - locAttr.get("current", 0);
            locAttr.set("current", 0);
            if (loc === 'ct' || loc === 'hd'){
                gameInfo.msg = buildMessageString(gameInfo.msg)  + gameInfo.mechName + " is destroyed!";
                return;
            }
            
            gameInfo.msg = buildMessageString(gameInfo.msg)  + gameInfo.mechName + "'s " + 
                loc.toUpperCase() + " was destroyed.  Damage cascades to " + cascadeLoc.toUpperCase() + ".";
                return hitArmor(cascadeLoc, newDam, gameInfo);
        }
    }
    
    function hitArmor(loc, dam, gameInfo) {        
        var locAttr = findObjs({
            _characterid: gameInfo.characterId,
            _type: "attribute",
            name: _attributeMap[loc] + "_armor",
        })[0];        

        if (locAttr === null || typeof locAttr === "undefined") {
            log("[BTTakeDamage.hitArmor] locAttr not defined. loc: " + loc + " dam: " + dam +" gameInfo.characterId: " + gameInfo.characterId);
            return;
        }
        var currArmor = locAttr.get("current");    
        if (currArmor === 0) {
            return hitInternal(loc, dam, gameInfo);
        } 
        
        /*
        log("[BTTakeDamage.HitArmor] loc: " + loc + " dam: " + dam + 
            " currArmor: " + currArmor + 
            " gameInfo.characterId: " + gameInfo.characterId + 
            " this._attributeMap[loc]: " + this._attributeMap[loc]);
        */
        if (parseInt(dam) > parseInt(currArmor)) {
            locAttr.set("current", 0);
            dam -= currArmor;
            gameInfo.msg = buildMessageString(gameInfo.msg) + gameInfo.mechName + 
                " armor at " + loc.toUpperCase() + " is gone.  Damage goes internal.";
            return hitInternal(loc, dam, gameInfo);
        }                 
        
        locAttr.set("current", currArmor - dam);
        gameInfo.msg = buildMessageString(gameInfo.msg)  +  gameInfo.mechName + 
            " was hit in the " + loc.toUpperCase() + " for " + dam + " damage.";
    }
    
    function criticalHitMech(characterId, loc) {
        loc = loc.toLowerCase();
        var upperOrLower, hit, component;
        var baseComp = _attributeMap[loc];
        var s = 0;
        
        var locarmor = loc + "_armor";
        var locAttr = findObjs({
            _characterid: characterId,
            _type: "attribute",
            name: locarmor,
        })[0];
        
        do {
            log("[BTTakeDamage] attempt: " + s);
            upperOrLower = randomInteger(6);
            hit = randomInteger(6);
            var componentName = baseComp + "_" + (upperOrLower < 4 ? "a" : "b") + hit.toString();
            log("BTTakeDamage.criticalHitMech: " + componentName);
            //criticalhit_lefttorso_b4 = 1 when hit, 0 or undefined when not-hit
            //lefttorso_b4            
        } while (component === null || s++ < 10);
    }
    
    // returns number of critical hits based upon hit location.  -1 if the limb is blown off.
    function findCriticalHits(loc) {
        var roll = randomInteger(6) + randomInteger(6);
        switch (roll) {
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                return 0;
            case 8:
            case 9:
                return 1;
            case 10:
            case 11:
                return 2;
            case 12:
                if (loc === null || loc === 'lt' || loc === 'rt' || loc === 'ct' || 
                    loc === 'ltr' || loc === 'rtr' || loc === 'ctr')
                    return 3;
                return -1;
        }
    }
    
    function buildMessageString(msg) { 
        return (_.isString(msg) ? msg + "<br/>" : "");
    }
    
    // used for mapping the root of the attirbute, doesn't include indicator such as "armor" or "internalstructure"
    var _attributeMap = {
        "hd": "head",
        "lt": "lefttorso",
        "la": "leftarm",
        "ll": "leftleg",
        "ltr": "lefttorso_rear",
        "lar": "leftarm",
        "llr": "leftleg",
        "rt": "righttorso",
        "ra": "rightarm",
        "rl": "rightleg",
        "rtr": "righttorso_rear",
        "rar": "rightarm",
        "rlr": "rightleg",
        "ct": "centertorso",
        "ctr": "centertorso_rear",
    };

    var _cascadeMap = {
        "ll" : "lt",
        "la" : "lt",
        "lt" : "ct",
        "rl" : "rt",
        "ra" : "rt",
        "rt" : "ct",
        "rtr" : "ctr",
        "ltr" : "ctr",
        "llr" : "ltr",
        "lar" : "ltr",
        "rar" : "rtr",
        "rlr" : "rtr",
    };
    
    return {
        HitMech : hitMech,
        CriticalHitMech : criticalHitMech
    };
})();

on("chat:message", function (msg) {
    if (msg.type == "api" && msg.content.indexOf("!td") !== -1) {
        var params = msg.content.split(" ");
        if (params.length !== 3) return;
        var loc = params[1].toLowerCase();
        var dam = params[2].toLowerCase();
        
        var currentChars = findObjs({
            _type: "character",
            controlledby : msg.playerid,
        });        
        
        if (currentChars.length !== 1) {
            sendChat("cannot find character");
            return;
        }        
        var character = currentChars[0];
        var gameInfo = { characterId: character.id, who: msg.who };
        log("[BTTakeDamage] playerid: " + msg.playerid + " characterId: "  + character.id);
        if (_.isNumber(dam) && _.isString(loc)){
            BTTakeDamage.HitMech(loc, dam, gameInfo);
            sendChat(msg.who, gameInfo.msg);   
        }
    }    
});