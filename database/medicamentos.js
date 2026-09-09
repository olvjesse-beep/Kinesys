/* ==========================================================================
   KINESYS - DICIONÁRIO DE MEDICAMENTOS (DATABASE)
   Arquivo: database/medicamentos.js
   ========================================================================== */

const dicionarioMedicamentos = {
    // --- ANTI-INFLAMATÓRIOS NÃO ESTEROIDAIS (AINEs) ---
    "ibuprofeno": "AINE (Ibuprofeno / Advil)",
    "advil": "AINE (Ibuprofeno / Advil)",
    "alivium": "AINE (Ibuprofeno / Advil)",
    "remedio pra dor": "AINE (Ibuprofeno / Advil)",

    "nimesulida": "AINE (Nimesulida / Nisulid)",
    "nisulid": "AINE (Nimesulida / Nisulid)",
    "nimesulid": "AINE (Nimesulida / Nisulid)",

    "diclofenaco": "AINE (Diclofenaco / Cataflam / Voltaren)",
    "cataflam": "AINE (Diclofenaco / Cataflam / Voltaren)",
    "voltaren": "AINE (Diclofenaco / Cataflam / Voltaren)",
    "diclofenaco de sodio": "AINE (Diclofenaco / Cataflam / Voltaren)",
    "diclofenaco de potassio": "AINE (Diclofenaco / Cataflam / Voltaren)",

    "cetoprofeno": "AINE (Cetoprofeno / Profenid)",
    "profenid": "AINE (Cetoprofeno / Profenid)",
    "artrosil": "AINE (Cetoprofeno / Profenid)",

    "cetorolaco": "AINE (Cetorolaco / Toragesic)",
    "toragesic": "AINE (Cetorolaco / Toragesic)",
    "sublingual pra dor": "AINE (Cetorolaco / Toragesic)",

    "piroxicam": "AINE (Piroxicam / Feldene)",
    "feldene": "AINE (Piroxicam / Feldene)",

    "meloxicam": "AINE (Meloxicam / Movatec)",
    "movatec": "AINE (Meloxicam / Movatec)",

    "celecoxibe": "AINE Inibidor COX-2 (Celecoxibe / Celebra)",
    "celebra": "AINE Inibidor COX-2 (Celecoxibe / Celebra)",

    "etoricoxibe": "AINE Inibidor COX-2 (Etoricoxibe / Arcoxia)",
    "arcoxia": "AINE Inibidor COX-2 (Etoricoxibe / Arcoxia)",

    // --- CORTICOIDES (ESTEROIDAIS) ---
    "prednisona": "Corticocosteroide (Prednisona / Meticorten)",
    "meticorten": "Corticocosteroide (Prednisona / Meticorten)",
    "corticoide": "Corticocosteroide (Prednisona / Meticorten)",

    "prednisolona": "Corticosteroide (Prednisolona / Prelone)",
    "prelone": "Corticosteroide (Prednisolona / Prelone)",

    "dexametasona": "Corticosteroide (Dexametasona / Decadron)",
    "decadron": "Corticosteroide (Dexametasona / Decadron)",

    "betametasona": "Corticosteroide (Betametasona / Diprospan)",
    "diprospan": "Corticosteroide (Betametasona / Diprospan)",
    "injections de corticoide": "Corticosteroide (Betametasona / Diprospan)",

    "desflazacorte": "Corticosteroide (Deflazacorte / Calcort)",
    "deflazacorte": "Corticosteroide (Deflazacorte / Calcort)",
    "calcort": "Corticosteroide (Deflazacorte / Calcort)",

    // --- ANTICOAGULANTES E ANTIAGREGANTES (BANDEIRAS VERMELHAS) ---
    "varfarina": "Anticoagulante (Varfarina / Marevan)",
    "marevan": "Anticoagulante (Varfarina / Marevan)",
    "remedio pra afinar sangue": "Anticoagulante (Varfarina / Marevan)",

    "rivaroxabana": "Anticoagulante (Rivaroxabana / Xarelto)",
    "xarelto": "Anticoagulante (Rivaroxabana / Xarelto)",

    "apixabana": "Anticoagulante (Apixabana / Eliquis)",
    "eliquis": "Anticoagulante (Apixabana / Eliquis)",

    "dabigatrana": "Anticoagulante (Dabigatrana / Pradaxa)",
    "pradaxa": "Anticoagulante (Dabigatrana / Pradaxa)",

    "enoxaparina": "Anticoagulante Injectavel (Enoxaparina / Clexane)",
    "clexane": "Anticoagulante Injectavel (Enoxaparina / Clexane)",
    "injecao na barriga": "Anticoagulante Injectavel (Enoxaparina / Clexane)",

    "aas": "Antiagregante Plaquetario (AAS / Aspirina / Somalgin)",
    "aspirina": "Antiagregante Plaquetario (AAS / Aspirina / Somalgin)",
    "somalgin": "Antiagregante Plaquetario (AAS / Aspirina / Somalgin)",
    "acido acetilsalicilico": "Antiagregante Plaquetario (AAS / Aspirina / Somalgin)",

    "clopidogrel": "Antiagregante Plaquetario (Clopidogrel / Plavix)",
    "plavix": "Antiagregante Plaquetario (Clopidogrel / Plavix)",

    // --- CARDIOVASCULARES E ANTI-HIPERTENSIVOS ---
    "losartana": "Anti-hipertensivo IECA/BRA (Losartana / Aradois)",
    "losartana potassica": "Anti-hipertensivo IECA/BRA (Losartana / Aradois)",
    "aradois": "Anti-hipertensivo IECA/BRA (Losartana / Aradois)",
    "remedio da pressao": "Anti-hipertensivo IECA/BRA (Losartana / Aradois)",

    "valsartana": "Anti-hipertensivo BRA (Valsartana / Diovan)",
    "diovan": "Anti-hipertensivo BRA (Valsartana / Diovan)",

    "candesartana": "Anti-hipertensivo BRA (Candesartana / Atacand)",
    "atacand": "Anti-hipertensivo BRA (Candesartana / Atacand)",

    "enalapril": "Anti-hipertensivo IECA (Enalapril / Renitec)",
    "renitec": "Anti-hipertensivo IECA (Enalapril / Renitec)",

    "captopril": "Anti-hipertensivo IECA (Captopril / Capoten)",
    "capoten": "Anti-hipertensivo IECA (Captopril / Capoten)",

    "atenolol": "Anti-hipertensivo Betabloqueador (Atenolol / Atenol)",
    "atenol": "Anti-hipertensivo Betabloqueador (Atenolol / Atenol)",

    "propranolol": "Anti-hipertensivo Betabloqueador (Propranolol / Inderal)",
    "inderal": "Anti-hipertensivo Betabloqueador (Propranolol / Inderal)",

    "carvedilol": "Anti-hipertensivo Betabloqueador (Carvedilol / Coreg)",
    "coreg": "Anti-hipertensivo Betabloqueador (Carvedilol / Coreg)",

    "anlodipino": "Anti-hipertensivo Bloq. Canal de Calcio (Anlodipino / Pressat)",
    "besilato de anlodipino": "Anti-hipertensivo Bloq. Canal de Calcio (Anlodipino / Pressat)",
    "pressat": "Anti-hipertensivo Bloq. Canal de Calcio (Anlodipino / Pressat)",

    "hidroclorotiazida": "Diuretico (Hidroclorotiazida / Clordil)",
    "clordil": "Diuretico (Hidroclorotiazida / Clordil)",
    "remedio de pressao agua": "Diuretico (Hidroclorotiazida / Clordil)",

    "furosemida": "Diuretico de Alca (Furosemida / Lasix)",
    "lasix": "Diuretico de Alca (Furosemida / Lasix)",
    "remedio pra inchaco": "Diuretico de Alca (Furosemida / Lasix)",

    "espironolactona": "Diuretico Poupadore de Potassio (Espironolactona / Aldactone)",
    "aldactone": "Diuretico Poupadore de Potassio (Espironolactona / Aldactone)",
// --- ESTATINAS E HIPOLIPEMIANTES ---
    "sinvastatina": "Estatina / Hipolipemiante (Sinvastatina / Zocor)",
    "zocor": "Estatina / Hipolipemiante (Sinvastatina / Zocor)",
    "remedio pro colesterol": "Estatina / Hipolipemiante (Sinvastatina / Zocor)",

    "atorvastatina": "Estatina / Hipolipemiante (Atorvastatina / Citor)",
    "citor": "Estatina / Hipolipemiante (Atorvastatina / Citor)",
    "lipitor": "Estatina / Hipolipemiante (Atorvastatina / Lipitor)",

    "rosuvastatina": "Estatina / Hipolipemiante (Rosuvastatina / Crestor)",
    "crestor": "Estatina / Hipolipemiante (Rosuvastatina / Crestor)",
    "roswas": "Estatina / Hipolipemiante (Rosuvastatina / Crestor)",

    "pravastatina": "Estatina / Hipolipemiante (Pravastatina / Pravacol)",
    "pravacol": "Estatina / Hipolipemiante (Pravastatina / Pravacol)",

    "ezetimiba": "Inibidor de Absorcao de Colesterol (Ezetimiba / Ezetrol)",
    "ezetrol": "Inibidor de Absorcao de Colesterol (Ezetimiba / Ezetrol)",

    "fenofibrato": "Fibrato / Hipolipemiante (Fenofibrato / Lipanthyl)",
    "lipanthyl": "Fibrato / Hipolipemiante (Fenofibrato / Lipanthyl)",

    // --- ANALGÉSICOS OPIOIDES E CENTRAIS ---
    "tramadol": "Opioide Fraco (Tramadol / Dorflex Uno / Tramal)",
    "tramal": "Opioide Fraco (Tramadol / Dorflex Uno / Tramal)",
    "dor severe": "Opioide Fraco (Tramadol / Dorflex Uno / Tramal)",

    "codeina": "Opioide Fraco (Codeina / Tylex / Codaten)",
    "tylex": "Opioide Fraco (Codeina / Tylex / Codaten)",
    "codaten": "Opioide Fraco (Codeina / Tylex / Codaten)",

    "morfina": "Opioide Forte (Morfina / Dimorf)",
    "dimorf": "Opioide Forte (Morfina / Dimorf)",

    "oxicodona": "Opioide Forte (Oxicodona / Oxycontin)",
    "oxycontin": "Opioide Forte (Oxicodona / Oxycontin)",

    "fentanila": "Opioide Forte (Fentanila / Durogesic)",
    "durogesic": "Opioide Forte (Fentanila / Durogesic)",
    "adesivo pra dor": "Opioide Forte (Fentanila / Durogesic)",

    "metadona": "Opioide Forte (Metadona / Mytadon)",
    "mytadon": "Opioide Forte (Metadona / Mytadon)",

    "buprenorfina": "Opioide Agonista Parcial (Buprenorfina / Restiva)",
    "restiva": "Opioide Agonista Parcial (Buprenorfina / Restiva)",

    // --- RELAXANTES MUSCULARES E ASSOCIAÇÕES ---
    "ciclobenzaprina": "Relaxante Muscular Central (Ciclobenzaprina / Miosan)",
    "miosan": "Relaxante Muscular Central (Ciclobenzaprina / Miosan)",
    "musculare": "Relaxante Muscular Central (Ciclobenzaprina / Miosan)",
    "remedio de travar as costas": "Relaxante Muscular Central (Ciclobenzaprina / Miosan)",

    "orfenadrina": "Relaxante Muscular (Orfenadrina / Dorflex)",
    "dorflex": "Relaxante Muscular (Orfenadrina / Dorflex)",
    "dorflex gota": "Relaxante Muscular (Orfenadrina / Dorflex)",

    "carisoprodol": "Relaxante Muscular / Analgesico (Carisoprodol / Torsilax / Tandrilax)",
    "torsilax": "Relaxante Muscular / Analgesico (Carisoprodol / Torsilax / Tandrilax)",
    "tandrilax": "Relaxante Muscular / Analgesico (Carisoprodol / Torsilax / Tandrilax)",

    "baclofeno": "Relaxante Muscular Espasmolitico (Baclofeno / Lioresal)",
    "lioresal": "Relaxante Muscular Espasmolitico (Baclofeno / Lioresal)",

    "tizanidina": "Relaxante Muscular Central (Tizanidina / Sirdalud)",
    "sirdalud": "Relaxante Muscular Central (Tizanidina / Sirdalud)",

    // --- ANTIDIABÉTICOS E METABÓLICOS ---
    "metformina": "Antidiabetico Biguanida (Metformina / Glifage)",
    "glifage": "Antidiabetico Biguanida (Metformina / Glifage)",
    "remedio do acucar": "Antidiabetico Biguanida (Metformina / Glifage)",

    "insulina": "Antidiabetico / Hormonio (Insulina NPH / Regular / Lantus)",
    "lantus": "Antidiabetico / Hormonio (Insulina NPH / Regular / Lantus)",
    "novorapid": "Antidiabetico / Hormonio (Insulina NPH / Regular / Lantus)",

    "gliclazida": "Antidiabetico Sulfonilureia (Gliclazida / Azukon)",
    "azukon": "Antidiabetico Sulfonilureia (Gliclazida / Azukon)",

    "glimepirida": "Antidiabetico Sulfonilureia (Glimepirida / Amaryl)",
    "amaryl": "Antidiabetico Sulfonilureia (Glimepirida / Amaryl)",

    "dapagliflozina": "Antidiabetico Inibidor SGLT2 (Dapagliflozina / Forxiga)",
    "forxiga": "Antidiabetico Inibidor SGLT2 (Dapagliflozina / Forxiga)",

    "empagliflozina": "Antidiabetico Inibidor SGLT2 (Empagliflozina / Jardiance)",
    "jardiance": "Antidiabetico Inibidor SGLT2 (Empagliflozina / Jardiance)",

    "semaglutida": "Agonista GLP-1 / Antidiabetico (Semaglutida / Ozempic / Rybelsus)",
    "ozempic": "Agonista GLP-1 / Antidiabetico (Semaglutida / Ozempic / Rybelsus)",
    "rybelsus": "Agonista GLP-1 / Antidiabetico (Semaglutida / Ozempic / Rybelsus)",
    "wegovy": "Agonista GLP-1 / Antidiabetico (Semaglutida / Ozempic / Rybelsus)",

    "liraglutida": "Agonista GLP-1 (Liraglutida / Victoza / Saxenda)",
    "victoza": "Agonista GLP-1 (Liraglutida / Victoza / Saxenda)",
    "saxenda": "Agonista GLP-1 (Liraglutida / Victoza / Saxenda)",

    // --- ANTINEURÁLGICOS, MODULADORES E ANTICONVULSIVANTES ---
    "pregabalina": "Modulador de Dor Neuropatica (Pregabalina / Lyrica)",
    "lyrica": "Modulador de Dor Neuropatica (Pregabalina / Lyrica)",
    "remedio de dor na nervo": "Modulador de Dor Neuropatica (Pregabalina / Lyrica)",

    "gabapentina": "Modulador de Dor Neuropatica (Gabapentina / Neurontin)",
    "neurontin": "Modulador de Dor Neuropatica (Gabapentina / Neurontin)",

    "carbamazepina": "Anticonvulsivante / Neuropatico (Carbamazepina / Tegretol)",
    "tegretol": "Anticonvulsivante / Neuropatico (Carbamazepina / Tegretol)",

    "oxcarbazepina": "Anticonvulsivante / Neuropatico (Oxcarbazepina / Trileptal)",
    "trileptal": "Anticonvulsivante / Neuropatico (Oxcarbazepina / Trileptal)",

    "topiramato": "Anticonvulsivante / Enxaqueca (Topiramato / Amato)",
    "amato": "Anticonvulsivante / Enxaqueca (Topiramato / Amato)",

    "lamotrigina": "Estabilizador / Anticonvulsivante (Lamotrigina / Lamictal)",
    "lamictal": "Estabilizador / Anticonvulsivante (Lamotrigina / Lamictal)",

    // --- ANTIDEPRESSIVOS (INIBIDORES DE RECEPTAÇÃO / DORES CRÔNICAS) ---
    "amitriptilina": "Antidepressivo Triciclico (Amitriptilina / Tryptanol)",
    "tryptanol": "Antidepressivo Triciclico (Amitriptilina / Tryptanol)",

    "nortriptilina": "Antidepressivo Triciclico (Nortriptilina / Pamelor)",
    "pamelor": "Antidepressivo Triciclico (Nortriptilina / Pamelor)",

    "duloxetina": "Inibidor Duplo / Dor Cronica (Duloxetina / Cymbalta)",
    "cymbalta": "Inibidor Duplo / Dor Cronica (Duloxetina / Cymbalta)",
    "velija": "Inibidor Duplo / Dor Cronica (Duloxetina / Cymbalta)",

    "venlafaxina": "Inibidor Duplo SNRI (Venlafaxina / Efexor)",
    "efexor": "Inibidor Duplo SNRI (Venlafaxina / Efexor)",

    "desvenlafaxina": "Inibidor Duplo SNRI (Desvenlafaxina / Pristiq)",
    "pristiq": "Inibidor Duplo SNRI (Desvenlafaxina / Pristiq)",

    "fluoxetina": "ISRS / Antidepressivo (Fluoxetina / Prozac)",
    "prozac": "ISRS / Antidepressivo (Fluoxetina / Prozac)",

    "sertralina": "ISRS / Antidepressivo (Sertralina / Zoloft)",
    "zoloft": "ISRS / Antidepressivo (Sertralina / Zoloft)",
    "assert": "ISRS / Antidepressivo (Sertralina / Zoloft)",

    "escitalopram": "ISRS / Antidepressivo (Escitalopram / Lexapro)",
    "lexapro": "ISRS / Antidepressivo (Escitalopram / Lexapro)",

    "citalopram": "ISRS / Antidepressivo (Citalopram / Celexa)",

    "paroxetina": "ISRS / Antidepressivo (Paroxetina / Aropax)",
    "aropax": "ISRS / Antidepressivo (Paroxetina / Aropax)",

    "bupropiona": "Inibidor Cap. Dopamina/Noradrenalina (Bupropiona / Wellbutrin)",
    "wellbutrin": "Inibidor Cap. Dopamina/Noradrenalina (Bupropiona / Wellbutrin)",

    // --- ANSIOLÍTICOS E BENZODIAZEPÍNICOS ---
    "clonazepam": "Benzodiazepina / Ansiolitico (Clonazepam / Rivotril)",
    "rivotril": "Benzodiazepina / Ansiolitico (Clonazepam / Rivotril)",
    "gotas de rivotril": "Benzodiazepina / Ansiolitico (Clonazepam / Rivotril)",

    "diazepam": "Benzodiazepina / Ansiolitico (Diazepam / Valium)",
    "valium": "Benzodiazepina / Ansiolitico (Diazepam / Valium)",

    "alprazolam": "Benzodiazepina / Ansiolitico (Alprazolam / Frontal)",
    "frontal": "Benzodiazepina / Ansiolitico (Alprazolam / Frontal)",

    "lorazepam": "Benzodiazepina / Ansiolitico (Lorazepam / Lorax)",
    "lorax": "Benzodiazepina / Ansiolitico (Lorazepam / Lorax)",

    "bromazepam": "Benzodiazepina / Ansiolitico (Bromazepam / Lexotan)",
    "lexotan": "Benzodiazepina / Ansiolitico (Bromazepam / Lexotan)",

    "zolpidem": "Hipnotico / Indutor do Sono (Zolpidem / Stilnox)",
    "stilnox": "Hipnotico / Indutor do Sono (Zolpidem / Stilnox)",

    // --- PROTETORES GÁSTRICOS E ANTIÁCIDOS ---
    "omeprazol": "Inibidor de Bomba de Protons (Omeprazol / Losec)",
    "losec": "Inibidor de Bomba de Protons (Omeprazol / Losec)",
    "remedio pro estomago": "Inibidor de Bomba de Protons (Omeprazol / Losec)",

    "pantoprazol": "Inibidor de Bomba de Protons (Pantoprazol / Pantozol)",
    "pantozol": "Inibidor de Bomba de Protons (Pantoprazol / Pantozol)",

    "esomeprazol": "Inibidor de Bomba de Protons (Esomeprazol / Nexium)",
    "nexium": "Inibidor de Bomba de Protons (Esomeprazol / Nexium)",

    "lansoprazol": "Inibidor de Bomba de Protons (Lansoprazol / Ogastro)",
    "ogastro": "Inibidor de Bomba de Protons (Lansoprazol / Ogastro)",

    "vonoprazana": "Bloqueador Acido Competitivo (Vonoprazana / Vonau)",
    "vonau": "Bloqueador Acido Competitivo (Vonoprazana / Vonau)",
// --- FITOTERÁPICOS E SUPLEMENTOS DE ALTO IMPACTO ---
    "ginkgo biloba": "Fitoterapico / Antiagregante (Ginkgo Biloba)",
    "ginkgo": "Fitoterapico / Antiagregante (Ginkgo Biloba)",
    "tebofortan": "Fitoterapico / Antiagregante (Ginkgo Biloba)",

    "erva de sao joao": "Fitoterapico Interacao Risco (Erva de Sao Joao / Hipericao)",
    "hipericao": "Fitoterapico Interacao Risco (Erva de Sao Joao / Hipericao)",
    "jantan": "Fitoterapico Interacao Risco (Erva de Sao Joao / Hipericao)",

    "curcuma": "Fitoterapico Anti-inflamatorio (Curcuma / Açafrão)",
    "extrato de curcuma": "Fitoterapico Anti-inflamatorio (Curcuma / Açafrão)",

    "garra do diabo": "Fitoterapico Anti-inflamatorio (Garra do Diabo / Arpadol)",
    "arpadol": "Fitoterapico Anti-inflamatorio (Garra do Diabo / Arpadol)",

    "canabidiol": "Canabinoide / Modulador Neuroimune (CBD / Canabidiol)",
    "cbd": "Canabinoide / Modulador Neuroimune (CBD / Canabidiol)",
    "oleo de maconha": "Canabinoide / Modulador Neuroimune (CBD / Canabidiol)",

    // --- ANALGÉSICOS COMUNS E ANTITÉRMICOS FREQUENTES ---
    "dipirona": "Analgesico / Antitermico (Dipirona / Novalgina / Anador)",
    "novalgina": "Analgesico / Antitermico (Dipirona / Novalgina / Anador)",
    "anador": "Analgesico / Antitermico (Dipirona / Novalgina / Anador)",
    "lisador": "Analgesico / Antitermico (Dipirona / Novalgina / Anador)",

    "paracetamol": "Analgesico / Antitermico (Paracetamol / Tylenol)",
    "tylenol": "Analgesico / Antitermico (Paracetamol / Tylenol)",
    "resfenol": "Analgesico / Antitermico (Paracetamol / Tylenol)",

    // --- IMUNOSSUPRESSORES, BIOLÓGICOS E BISFOSFONATOS ---
    "metotrexato": "Imunossupressor / Antimetabolito (Metotrexato / Mixtrax)",
    "mixtrax": "Imunossupressor / Antimetabolito (Metotrexato / Mixtrax)",
    "remedio de artrite": "Imunossupressor / Antimetabolito (Metotrexato / Mixtrax)",

    "leflunomida": "Imunossupressor / Antireumatico (Leflunomida / Arava)",
    "arava": "Imunossupressor / Antireumatico (Leflunomida / Arava)",

    "azatioprina": "Imunossupressor (Azatioprina / Imuran)",
    "imuran": "Imunossupressor (Azatioprina / Imuran)",

    "hidroxicloroquina": "Imunomodulador / Antimalarico (Hidroxicloroquina / Reuquinol)",
    "reuquinol": "Imunomodulador / Antimalarico (Hidroxicloroquina / Reuquinol)",

    "alendronato": "Bisfosfonato / Massa Ossea (Alendronato / Fosamax)",
    "fosamax": "Bisfosfonato / Massa Ossea (Alendronato / Fosamax)",

    "risedronato": "Bisfosfonato / Massa Ossea (Risedronato / Actonel)",
    "actonel": "Bisfosfonato / Massa Ossea (Risedronato / Actonel)",

    "acido zoledronico": "Bisfosfonato Injetavel (Acido Zoledronico / Aclasta)",
    "aclasta": "Bisfosfonato Injetavel (Acido Zoledronico / Aclasta)",

// --- CORTICOIDES TÓPICOS E INALATÓRIOS ---
    "budesonida": "Corticosteroide Inalatorio (Budesonida / Pulmicort / Symbicort)",
    "pulmicort": "Corticosteroide Inalatorio (Budesonida / Pulmicort / Symbicort)",
    "symbicort": "Corticosteroide Inalatorio (Budesonida / Pulmicort / Symbicort)",
    "bombinha de asma": "Corticosteroide Inalatorio (Budesonida / Pulmicort / Symbicort)",

    "fluticasona": "Corticosteroide Inalatorio (Fluticasona / Seretide / Avamys)",
    "seretide": "Corticosteroide Inalatorio (Fluticasona / Seretide / Avamys)",
    "avamys": "Corticosteroide Inalatorio (Fluticasona / Seretide / Avamys)",

    "beclometasona": "Corticosteroide Inalatorio (Beclometasona / Clenil)",
    "clenil": "Corticosteroide Inalatorio (Beclometasona / Clenil)",

    // --- OUTROS MEDICAMENTOS RELEVANTES NA ANAMNESE ---
    "allopurinol": "Inibidor de Acido Urico / Gota (Alopurinol / Zyloric)",
    "zyloric": "Inibidor de Acido Urico / Gota (Alopurinol / Zyloric)",
    "remedio de gota": "Inibidor de Acido Urico / Gota (Alopurinol / Zyloric)",

    "colchicina": "Anti-gotoso / Crise de Gota (Colchicina / Colchis)",
    "colchis": "Anti-gotoso / Crise de Gota (Colchicina / Colchis)",

    "levotiroxina": "Hormonio Tireoidiano (Levotiroxina / Puran T4 / Euthyrox)",
    "puran": "Hormonio Tireoidiano (Levotiroxina / Puran T4 / Euthyrox)",
    "puran t4": "Hormonio Tireoidiano (Levotiroxina / Puran T4 / Euthyrox)",
    "remedio de tireoide": "Hormonio Tireoidiano (Levotiroxina / Puran T4 / Euthyrox)",

    // --- FLUOROQUINOLONAS (ALERTA TENDÍNEO) ---
    "ciprofloxacino": "Antibiotico Fluoroquinolona (Ciprofloxacino)",
    "ciprofloxacin": "Antibiotico Fluoroquinolona (Ciprofloxacino)",
    "levofloxacino": "Antibiotico Fluoroquinolona (Levofloxacino)",
    "levofloxacin": "Antibiotico Fluoroquinolona (Levofloxacino)",
    "moxifloxacino": "Antibiotico Fluoroquinolona (Moxifloxacino)",
    "moxifloxacin": "Antibiotico Fluoroquinolona (Moxifloxacino)",
    "fluoroquinolona": "Antibiotico Fluoroquinolona"
};