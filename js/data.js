/* ============================================================
 * data.js —— 基础数据库（继承自旧版工作台，未做改动）
 *   色卡库 COLOR_DB / 唇色系 LIP_FAMILIES / 腮红色系 BLUSH_FAMILIES
 *   品牌色号库 SHADE_DB / 场合 OCCASIONS / 温度带 tempBand()
 * ============================================================ */
/* ================= 数据库：颜色 / 色系 / 场景 / 温度 ================= */
/* fam = 色卡分组；tone = 冷暖（cold冷/warm暖/neutral中性）；depth = 深浅 1浅~9深 */
const COLOR_DB = {
  /* 中性 */
  "白":{hex:"#F7F7F3",tone:"neutral",depth:1,fam:"中性"},
  "象牙白":{hex:"#F1EBDF",tone:"warm",depth:1,fam:"中性"},
  "米白":{hex:"#EDE4D3",tone:"warm",depth:2,fam:"中性"},
  "奶油":{hex:"#F5EDDC",tone:"warm",depth:1,fam:"中性"},
  "浅灰":{hex:"#CDCCC8",tone:"neutral",depth:3,fam:"中性"},
  "银灰":{hex:"#B5B8BC",tone:"neutral",depth:4,fam:"中性"},
  "灰":{hex:"#9A9A9A",tone:"neutral",depth:5,fam:"中性"},
  "深灰":{hex:"#5A5A5A",tone:"neutral",depth:7,fam:"中性"},
  "黑":{hex:"#2B2B2B",tone:"neutral",depth:9,fam:"中性"},
  /* 蓝 */
  "天蓝":{hex:"#A8CDE3",tone:"cold",depth:2,fam:"蓝"},
  "浅蓝":{hex:"#8FBCE0",tone:"cold",depth:3,fam:"蓝"},
  "湖蓝":{hex:"#6FA8B8",tone:"cold",depth:4,fam:"蓝"},
  "雾霾蓝":{hex:"#93A8BC",tone:"cold",depth:4,fam:"蓝"},
  "牛仔蓝":{hex:"#5D7A9E",tone:"cold",depth:5,fam:"蓝"},
  "蓝":{hex:"#5B7FA6",tone:"cold",depth:5,fam:"蓝"},
  "灰蓝":{hex:"#6E7F94",tone:"cold",depth:6,fam:"蓝"},
  "宝蓝":{hex:"#2F5AA8",tone:"cold",depth:7,fam:"蓝"},
  "藏蓝":{hex:"#2E3A5C",tone:"cold",depth:8,fam:"蓝"},
  /* 绿 */
  "薄荷绿":{hex:"#B7D4C2",tone:"cold",depth:2,fam:"绿"},
  "牛油果绿":{hex:"#7C8C5A",tone:"warm",depth:5,fam:"绿"},
  "军绿":{hex:"#6B7050",tone:"warm",depth:6,fam:"绿"},
  "墨绿":{hex:"#2F4A3F",tone:"cold",depth:7,fam:"绿"},
  /* 紫 */
  "香芋紫":{hex:"#CDBBD6",tone:"cold",depth:3,fam:"紫"},
  "薰衣草紫":{hex:"#B9AEC9",tone:"cold",depth:4,fam:"紫"},
  "紫":{hex:"#9B8AA6",tone:"cold",depth:5,fam:"紫"},
  /* 红粉 */
  "浅粉":{hex:"#F7D7DB",tone:"cold",depth:1,fam:"红粉"},
  "粉":{hex:"#F2C4C8",tone:"cold",depth:2,fam:"红粉"},
  "蜜桃粉":{hex:"#F5C6BC",tone:"warm",depth:2,fam:"红粉"},
  "豆沙粉":{hex:"#D9A6A6",tone:"cold",depth:3,fam:"红粉"},
  "干枯玫瑰粉":{hex:"#C8938F",tone:"cold",depth:4,fam:"红粉"},
  "玫红":{hex:"#C2547A",tone:"cold",depth:6,fam:"红粉"},
  "红":{hex:"#C0392B",tone:"warm",depth:7,fam:"红粉"},
  "酒红":{hex:"#7A3740",tone:"warm",depth:8,fam:"红粉"},
  /* 橘黄 */
  "鹅黄":{hex:"#F2DE8A",tone:"warm",depth:2,fam:"橘黄"},
  "柠檬黄":{hex:"#E8D45C",tone:"warm",depth:3,fam:"橘黄"},
  "芥末黄":{hex:"#C9A227",tone:"warm",depth:5,fam:"橘黄"},
  "杏":{hex:"#F0CBA8",tone:"warm",depth:2,fam:"橘黄"},
  "橘":{hex:"#E07A3F",tone:"warm",depth:5,fam:"橘黄"},
  /* 棕 */
  "燕麦":{hex:"#D9CFBE",tone:"warm",depth:2,fam:"棕"},
  "奶茶":{hex:"#C7AE95",tone:"warm",depth:3,fam:"棕"},
  "卡其":{hex:"#B89968",tone:"warm",depth:4,fam:"棕"},
  "驼":{hex:"#C99E74",tone:"warm",depth:4,fam:"棕"},
  "焦糖":{hex:"#A9744A",tone:"warm",depth:5,fam:"棕"},
  "棕":{hex:"#8B6647",tone:"warm",depth:6,fam:"棕"},
  "咖":{hex:"#6F5138",tone:"warm",depth:7,fam:"棕"},
  "咖啡":{hex:"#5C4636",tone:"warm",depth:8,fam:"棕"}
};
const COLOR_FAM_ORDER = ["中性","蓝","绿","紫","红粉","橘黄","棕"];
const LIP_FAMILIES = {
  "豆沙":{tone:"neutral",sat:2,vibes:["通勤","温柔","日常"],ex:"#B4766E",desc:"日常最稳的温柔色"},
  "玫瑰":{tone:"cold",sat:3,vibes:["清冷","气质","通勤"],ex:"#B26E78",desc:"气质挂冷调"},
  "干燥玫瑰":{tone:"cold",sat:3,vibes:["气质","秋冬","通勤"],ex:"#B58585",desc:"高级的灰调玫瑰"},
  "正红":{tone:"neutral",sat:5,vibes:["正式","气场"],ex:"#B0252F",desc:"经典大红，气场全开"},
  "橘调":{tone:"warm",sat:4,vibes:["活力","出游"],ex:"#D96C3F",desc:"元气暖调"},
  "番茄":{tone:"warm",sat:4,vibes:["活力","出游","甜"],ex:"#C93A2E",desc:"红中带橘，显白活力"},
  "枫叶砖红":{tone:"warm",sat:4,vibes:["复古","秋冬","气场"],ex:"#8D4A3C",desc:"复古红棕，秋冬绝配"},
  "梅子浆果":{tone:"cold",sat:5,vibes:["气场","秋冬"],ex:"#7E3B52",desc:"深梅子色，冷调气场"},
  "裸色奶茶":{tone:"warm",sat:1,vibes:["伪素颜","日常"],ex:"#C4A085",desc:"裸感奶咖，伪素颜"},
  "水红":{tone:"neutral",sat:3,vibes:["元气","约会","甜"],ex:"#E05766",desc:"水润感元气红"}
};
const BLUSH_FAMILIES = {
  "蜜桃":{tone:"warm",sat:2,vibes:["元气","约会","日常"],ex:"#F2B4A0",desc:"温柔蜜桃粉"},
  "珊瑚":{tone:"warm",sat:3,vibes:["活力","出游"],ex:"#F09A85",desc:"元气珊瑚橘"},
  "杏色":{tone:"warm",sat:2,vibes:["温柔","日常","通勤"],ex:"#EDB08C",desc:"柔和杏橘"},
  "奶油橘":{tone:"warm",sat:1,vibes:["伪素颜","日常"],ex:"#F4C4A3",desc:"奶感浅橘"},
  "玫瑰粉":{tone:"cold",sat:2,vibes:["气质","清冷","通勤"],ex:"#E8A4AC",desc:"冷调玫瑰粉"},
  "豆沙粉":{tone:"neutral",sat:2,vibes:["通勤","温柔"],ex:"#DDA094",desc:"日常豆沙调"},
  "梅子":{tone:"cold",sat:4,vibes:["气场","秋冬"],ex:"#C47B8E",desc:"冷调梅子色"}
};
/* ================= 品牌速录数据库 ================= */
const SHADE_DB = {
  lip: {
    "MAC (魅可)": {
      "子弹头 (Matte / Retro)": [
        {code:"923",nick:"蜜桃奶咖",family:"裸色奶茶",hex:"#B98878"},
        {code:"316",nick:"泫雅色",family:"玫瑰",hex:"#D65467"},
        {code:"308",nick:"甜橘",family:"橘调",hex:"#E16437"},
        {code:"707",nick:"牛血色",family:"梅子浆果",hex:"#7B3A4A"},
        {code:"999",nick:"正红",family:"正红",hex:"#A82433"},
        {code:"Ruby Woo",nick:"经典蓝调红",family:"正红",hex:"#A22031"},
        {code:"Chili",nick:"小辣椒",family:"枫叶砖红",hex:"#A14237"},
        {code:"Marrakesh",nick:"摩洛哥红棕",family:"枫叶砖红",hex:"#A85441"},
        {code:"314",nick:"白桃奶茶",family:"裸色奶茶",hex:"#C49A85"}
      ],
      "尤雾弹 (Powder Kiss)": [
        {code:"989",nick:"草莓红",family:"水红",hex:"#D6435A"},
        {code:"931",nick:"烟粉玫瑰",family:"干燥玫瑰",hex:"#B58388"},
        {code:"922",nick:"裸感奶咖",family:"豆沙",hex:"#B48478"},
        {code:"308",nick:"蜜橘",family:"橘调",hex:"#E27A4D"}
      ],
      "子弹头 (Satin)": [
        {code:"Taupe",nick:"深咖玫瑰",family:"干燥玫瑰",hex:"#9D6A65"},
        {code:"Rebel",nick:"浆果紫",family:"梅子浆果",hex:"#874063"}
      ]
    },
    "YSL (圣罗兰)": {
      "小金条 (Rouge Pur Couture)": [
        {code:"21",nick:"复古正红",family:"正红",hex:"#B92C36"},
        {code:"12",nick:"斩男粉",family:"水红",hex:"#D45F6E"},
        {code:"9",nick:"复古玫红",family:"玫瑰",hex:"#B14A66"},
        {code:"1966",nick:"暖红棕",family:"枫叶砖红",hex:"#A14636"},
        {code:"N1",nick:"裸粉",family:"豆沙",hex:"#C49A95"},
        {code:"1",nick:"Le Rouge 经典正红",family:"正红",hex:"#A5222E"},
        {code:"13",nick:"正橘",family:"橘调",hex:"#E0673F"},
        {code:"52",nick:"裸粉",family:"裸色奶茶",hex:"#BD9080"},
        {code:"17",nick:"玫瑰粉",family:"水红",hex:"#D85972"},
        {code:"36",nick:"酒红",family:"梅子浆果",hex:"#7E3340"},
        {code:"72",nick:"蜜桃橘",family:"橘调",hex:"#E07A48"}
      ],
      "黑管唇釉 (Vernis à Lèvres)": [
        {code:"416",nick:"烂番茄",family:"番茄",hex:"#C1322A"},
        {code:"409",nick:"车厘子",family:"梅子浆果",hex:"#7E3043"},
        {code:"610",nick:"浆果梅",family:"梅子浆果",hex:"#8B3D55"},
        {code:"432",nick:"干枯玫瑰",family:"干燥玫瑰",hex:"#A56A6F"},
        {code:"407",nick:"酒红",family:"梅子浆果",hex:"#6E2E3E"},
        {code:"302",nick:"赤裸豆沙",family:"裸色奶茶",hex:"#C09186"},
        {code:"440",nick:"复古玫红",family:"玫瑰",hex:"#B45A6A"},
        {code:"446",nick:"橘调",family:"橘调",hex:"#E0673F"}
      ],
      "圆管 (Rouge Volupté)": [
        {code:"12",nick:"水蜜桃",family:"水红",hex:"#E36F7D"},
        {code:"80",nick:"烂番茄色",family:"番茄",hex:"#C23A2A"},
        {code:"86",nick:"蜜桃橘",family:"橘调",hex:"#D86A4D"}
      ]
    },
    "Dior (迪奥)": {
      "蓝金 (Rouge Dior)": [
        {code:"999",nick:"传奇正红",family:"正红",hex:"#A8202B"},
        {code:"720",nick:"玫瑰豆沙",family:"豆沙",hex:"#B07670"},
        {code:"740",nick:"枫叶红棕",family:"枫叶砖红",hex:"#A24A37"},
        {code:"888",nick:"橘调正红",family:"番茄",hex:"#C23A2A"},
        {code:"080",nick:"微笑红",family:"正红",hex:"#B7292F"},
        {code:"100",nick:"裸粉色",family:"豆沙",hex:"#B78880"},
        {code:"365",nick:"蜜桃粉",family:"水红",hex:"#DD7080"},
        {code:"643",nick:"焦糖栗子",family:"枫叶砖红",hex:"#9A5440"}
      ],
      "黑管漆光 (Addict Lacquer Stick)": [
        {code:"757",nick:"复古红",family:"正红",hex:"#A52231"},
        {code:"553",nick:"裸色",family:"裸色奶茶",hex:"#BD9082"}
      ]
    },
    "Armani (阿玛尼)": {
      "红管唇釉 (Lips Magnet)": [
        {code:"405",nick:"烂番茄",family:"番茄",hex:"#C2342A"},
        {code:"206",nick:"枫叶红",family:"枫叶砖红",hex:"#9A4537"},
        {code:"400",nick:"蓝调正红",family:"正红",hex:"#A21E2A"},
        {code:"200",nick:"裸色",family:"裸色奶茶",hex:"#C09886"},
        {code:"501",nick:"豆沙粉",family:"豆沙",hex:"#B97C7B"},
        {code:"415",nick:"玫红",family:"玫瑰",hex:"#B14A66"}
      ],
      "小胖丁 (Lip Magnet Matte)": [
        {code:"504",nick:"酒红",family:"梅子浆果",hex:"#7E3B4D"},
        {code:"506",nick:"玫粉",family:"玫瑰",hex:"#B25A78"}
      ]
    },
    "Chanel (香奈儿)": {
      "可可小姐 (Rouge Allure)": [
        {code:"58",nick:"红棕",family:"枫叶砖红",hex:"#9A4437"},
        {code:"154",nick:"复古深红",family:"正红",hex:"#A02835"},
        {code:"116",nick:"深红",family:"正红",hex:"#9E2532"},
        {code:"914",nick:"玫瑰",family:"干燥玫瑰",hex:"#A56A6E"},
        {code:"112",nick:"正红",family:"正红",hex:"#A5202E"}
      ],
      "丝绒 (Rouge Allure Velvet)": [
        {code:"56",nick:"裸粉色",family:"豆沙",hex:"#B48478"},
        {code:"70",nick:"紫红",family:"梅子浆果",hex:"#823650"}
      ]
    },
    "Givenchy (纪梵希)": {
      "小羊皮 (Rouge Givenchy)": [
        {code:"304",nick:"玫瑰红",family:"玫瑰",hex:"#B45A6A"},
        {code:"305",nick:"正红",family:"正红",hex:"#A82A32"},
        {code:"306",nick:"复古红棕",family:"枫叶砖红",hex:"#A04A3A"},
        {code:"315",nick:"紫罗兰",family:"梅子浆果",hex:"#7B3654"},
        {code:"N37",nick:"正红",family:"正红",hex:"#A5222E"}
      ]
    },
    "Tom Ford": {
      "黑金管 (Lip Color)": [
        {code:"16",nick:"Scarlet Rouge",family:"正红",hex:"#9F1F2B"},
        {code:"80",nick:"Impassioned",family:"正红",hex:"#A82231"},
        {code:"69",nick:"Night Mauve",family:"梅子浆果",hex:"#7A344A"},
        {code:"52",nick:"Bare",family:"裸色奶茶",hex:"#C09886"}
      ]
    },
    "NARS": {
      "唇膏 (Lipstick)": [
        {code:"Dolce Vita",nick:"豆沙粉",family:"豆沙",hex:"#B57870"},
        {code:"Red Lizard",nick:"正红",family:"正红",hex:"#A6222D"},
        {code:"Cruella",nick:"蓝调红",family:"正红",hex:"#A22031"},
        {code:"Mysterious Red",nick:"酒红",family:"梅子浆果",hex:"#7E3344"}
      ]
    },
    "3CE": {
      "哑光唇釉 (Lip Killer)": [
        {code:"909",nick:"复古红",family:"正红",hex:"#A22833"},
        {code:"906",nick:"砖红",family:"枫叶砖红",hex:"#A04A3A"},
        {code:"905",nick:"红棕",family:"枫叶砖红",hex:"#9A4434"},
        {code:"908",nick:"干枯玫瑰",family:"干燥玫瑰",hex:"#A86E70"},
        {code:"Going Right",nick:"裸色",family:"裸色奶茶",hex:"#BD9080"},
        {code:"Taupe",nick:"红棕",family:"枫叶砖红",hex:"#965039"}
      ],
      "水润唇釉 (Glossy Lip)": [
        {code:"Lay Down",nick:"玫瑰粉",family:"水红",hex:"#D3687A"},
        {code:"Squeezed",nick:"豆沙",family:"豆沙",hex:"#B27E78"}
      ]
    },
    "完美日记 (Perfect Diary)": {
      "动物眼影/小细管": [
        {code:"117",nick:"暮色蔷薇",family:"干燥玫瑰",hex:"#A86E73"},
        {code:"906",nick:"反重力",family:"正红",hex:"#A22A33"},
        {code:"007",nick:"银翼杀手",family:"梅子浆果",hex:"#7E3548"},
        {code:"016",nick:"烈焰",family:"正红",hex:"#A0212C"},
        {code:"912",nick:"倾心",family:"玫瑰",hex:"#B05568"},
        {code:"208",nick:"执念",family:"枫叶砖红",hex:"#9E4A39"},
        {code:"939",nick:"桃色派对",family:"橘调",hex:"#DE724A"},
        {code:"608",nick:"玫粉",family:"玫瑰",hex:"#B45A6A"},
        {code:"709",nick:"正红",family:"正红",hex:"#A2222E"},
        {code:"505",nick:"烂番茄",family:"番茄",hex:"#C03A2A"},
        {code:"616",nick:"枫叶",family:"枫叶砖红",hex:"#9A4534"}
      ],
      "天鹅绒唇釉": [
        {code:"V07",nick:"红丝绒",family:"正红",hex:"#A82A33"},
        {code:"V01",nick:"朱砂橘",family:"番茄",hex:"#C23A2A"}
      ]
    },
    "花西子 (Florasis)": {
      "同心锁雕花唇釉": [
        {code:"M509",nick:"绛仙绣",family:"正红",hex:"#A22230"},
        {code:"M108",nick:"红",family:"正红",hex:"#A82433"},
        {code:"M127",nick:"胭脂红",family:"水红",hex:"#D05066"},
        {code:"M131",nick:"红豆沙",family:"豆沙",hex:"#B57A73"},
        {code:"M501",nick:"烂番茄",family:"番茄",hex:"#C2362A"},
        {code:"M218",nick:"焦糖",family:"枫叶砖红",hex:"#9A4534"}
      ]
    },
    "INTO YOU": {
      "空气唇泥 (Air Matte)": [
        {code:"04",nick:"野番茄",family:"番茄",hex:"#C03A2A"},
        {code:"23",nick:"酒红",family:"梅子浆果",hex:"#7E3548"},
        {code:"13",nick:"红棕",family:"枫叶砖红",hex:"#9A4534"},
        {code:"07",nick:"裸色",family:"裸色奶茶",hex:"#BD9080"},
        {code:"22",nick:"红",family:"正红",hex:"#A2222E"},
        {code:"EM11",nick:"甜橘",family:"橘调",hex:"#E07A48"}
      ]
    },
    "Joocyee 酵色": {
      "多用膏 / 唇霜": [
        {code:"V107",nick:"红豆沙",family:"豆沙",hex:"#B57A73"},
        {code:"V101",nick:"酒红",family:"梅子浆果",hex:"#7E3340"},
        {code:"V113",nick:"番茄",family:"番茄",hex:"#C03A2A"},
        {code:"V108",nick:"枫叶",family:"枫叶砖红",hex:"#9A4534"},
        {code:"J02",nick:"裸色",family:"裸色奶茶",hex:"#BD9080"}
      ]
    },
    "兰瑟 (Lansur)": {
      "花漾甜心唇釉 (8色套装)": [
        {code:"01",nick:"正红",family:"正红",hex:"#A2222E"},
        {code:"02",nick:"番茄",family:"番茄",hex:"#C03A2A"},
        {code:"03",nick:"枫叶",family:"枫叶砖红",hex:"#9A4534"},
        {code:"04",nick:"豆沙",family:"豆沙",hex:"#B57A73"},
        {code:"05",nick:"玫瑰",family:"玫瑰",hex:"#B45A6A"},
        {code:"06",nick:"蜜桃",family:"水红",hex:"#D85F72"},
        {code:"07",nick:"橘调",family:"橘调",hex:"#E0673F"},
        {code:"08",nick:"裸色",family:"裸色奶茶",hex:"#BD9080"}
      ]
    },
    "毛戈平 (MaoGeping)": {
      "空气仓唇釉": [
        {code:"801",nick:"经典正红",family:"正红",hex:"#A2222E"},
        {code:"806",nick:"红棕",family:"枫叶砖红",hex:"#9A4534"},
        {code:"807",nick:"奶茶豆沙",family:"豆沙",hex:"#B48478"},
        {code:"802",nick:"玫瑰",family:"玫瑰",hex:"#B45A6A"},
        {code:"805",nick:"番茄",family:"番茄",hex:"#C03A2A"},
        {code:"808",nick:"酒红",family:"梅子浆果",hex:"#7E3340"}
      ]
    }
  },
  blush: {
    "NARS": {
      "经典腮红": [
        {code:"ORGASM",nick:"高潮",family:"蜜桃",hex:"#E89890"},
        {code:"DEEP THROAT",nick:"深喉",family:"珊瑚",hex:"#E29087"},
        {code:"GINA",nick:"吉娜",family:"杏色",hex:"#E5A892"},
        {code:"TAIWAN",nick:"蜜桃",family:"蜜桃",hex:"#EDB29C"},
        {code:"IMPASSE",nick:"玫瑰",family:"玫瑰粉",hex:"#D88A92"},
        {code:"SIN",nick:"玫紫",family:"梅子",hex:"#C77F8E"}
      ]
    },
    "3CE": {
      "单色腮红 (Mono)": [
        {code:"MONO PINK",nick:"樱花粉",family:"玫瑰粉",hex:"#DDA0AA"},
        {code:"ROSY",nick:"玫瑰",family:"玫瑰粉",hex:"#D88A92"},
        {code:"PINK",nick:"嫩粉",family:"玫瑰粉",hex:"#E8AAB5"},
        {code:"CORAL",nick:"珊瑚",family:"珊瑚",hex:"#ED9A88"}
      ]
    },
    "完美日记 (Perfect Diary)": {
      "动物眼影 (腮红色)": [
        {code:"19",nick:"蜜桃",family:"蜜桃",hex:"#EDB29C"},
        {code:"23",nick:"杏橘",family:"杏色",hex:"#E5A892"},
        {code:"28",nick:"玫粉",family:"玫瑰粉",hex:"#D88A92"},
        {code:"31",nick:"豆沙",family:"豆沙粉",hex:"#DDA098"}
      ]
    },
    "花西子 (Florasis)": {
      "空气蜜粉 (腮红色)": [
        {code:"B01",nick:"桃粉",family:"蜜桃",hex:"#EDB29C"},
        {code:"B02",nick:"杏橘",family:"杏色",hex:"#E5A892"},
        {code:"B03",nick:"豆沙",family:"豆沙粉",hex:"#DDA098"},
        {code:"B04",nick:"梅子",family:"梅子",hex:"#C77F8E"}
      ]
    },
    "Joocyee 酵色": {
      "多用膏": [
        {code:"L101",nick:"蜜桃",family:"蜜桃",hex:"#EDB29C"},
        {code:"L102",nick:"杏色",family:"杏色",hex:"#E5A892"},
        {code:"L103",nick:"玫瑰",family:"玫瑰粉",hex:"#D88A92"},
        {code:"L104",nick:"豆沙",family:"豆沙粉",hex:"#DDA098"}
      ]
    },
    "橘朵 (Judydoll)": {
      "单色腮红": [
        {code:"35",nick:"杏橘",family:"杏色",hex:"#E5A892"},
        {code:"39",nick:"蜜桃",family:"蜜桃",hex:"#EDB29C"},
        {code:"41",nick:"玫粉",family:"玫瑰粉",hex:"#D88A92"},
        {code:"42",nick:"豆沙",family:"豆沙粉",hex:"#DDA098"}
      ]
    },
    "MAC": {
      "矿物腮红": [
        {code:"PEACHES",nick:"蜜桃",family:"蜜桃",hex:"#EDB29C"},
        {code:"GENTLE",nick:"玫瑰",family:"玫瑰粉",hex:"#D88A92"},
        {code:"DAME",nick:"杏色",family:"杏色",hex:"#E5A892"},
        {code:"FRANNY BOY",nick:"豆沙",family:"豆沙粉",hex:"#DDA098"}
      ]
    },
    "卡姿兰 (Carslan)": {
      "炫亮胭脂": [
        {code:"04",nick:"失落玫瑰",family:"玫瑰粉",hex:"#D88A92"},
        {code:"01",nick:"樱花粉",family:"玫瑰粉",hex:"#E8AAB5"},
        {code:"02",nick:"蜜桃",family:"蜜桃",hex:"#EDB29C"},
        {code:"03",nick:"珊瑚橘",family:"珊瑚",hex:"#ED9A88"},
        {code:"05",nick:"豆沙",family:"豆沙粉",hex:"#DDA098"}
      ]
    },
    "兰瑟 (Lansur)": {
      "星途云雾腮红盘": [
        {code:"02",nick:"烟幕橘",family:"杏色",hex:"#E5A892"},
        {code:"01",nick:"蜜桃粉",family:"蜜桃",hex:"#EDB29C"},
        {code:"03",nick:"玫瑰",family:"玫瑰粉",hex:"#D88A92"},
        {code:"04",nick:"豆沙",family:"豆沙粉",hex:"#DDA098"}
      ]
    }
  }
};
const OCCASIONS = {
  "日常通勤":{lipSat:[1,3],vibes:["通勤","日常","温柔","伪素颜"],lipTxt:"低饱和日常色",blushTxt:"自然轻薄"},
  "休闲出游":{lipSat:[3,5],vibes:["活力","出游","甜"],lipTxt:"显气色的活力色",blushTxt:"元气感可以重手一点"},
  "正式场合":{lipSat:[4,5],vibes:["正式","气场","气质"],lipTxt:"经典有气场的颜色",blushTxt:"收敛、修容为主"},
  "约会":{lipSat:[2,4],vibes:["甜","元气","约会","温柔"],lipTxt:"水润甜感色",blushTxt:"氛围感粉调"},
  "居家放松":{lipSat:[1,2],vibes:["伪素颜","日常"],lipTxt:"近乎唇色的滋润色",blushTxt:"不画也行"}
};
function tempBand(t){
  if(t>=30) return {name:"酷热",range:[1,1],tip:"尽量选最薄的衣物，妆容注意控油定妆、防水防汗。"};
  if(t>=26) return {name:"炎热",range:[1,2],tip:"轻薄透气为主，底妆选持妆控油款，定妆喷雾锁住。"};
  if(t>=21) return {name:"舒适",range:[2,3],tip:"体感最舒服的温度，衬衫/薄长袖随便穿，妆容无限制。"};
  if(t>=16) return {name:"凉爽",range:[2,4],tip:"早晚有温差，加一件薄外搭/针织开衫正合适。"};
  if(t>=11) return {name:"微冷",range:[3,4],tip:"夹克、风衣、卫衣类登场，底妆前记得保湿防卡粉。"};
  if(t>=5)  return {name:"寒冷",range:[4,5],tip:"厚针织+大衣安排上，室内外温差大，底妆以服帖保湿为先。"};
  return {name:"严寒",range:[4,5],tip:"羽绒服+厚大衣，围巾手套护住，唇膏前先用润唇打底防起皮。"};
}
const TEMP_TIPS_BASE = {
  hot:"高温天：底妆薄涂+定妆喷雾；出门前吸油纸备着。",
  mid:"温度适中：妆容正常走流程即可。",
  cold:"低温天：妆前乳要保湿型，粉底少量多次防卡粉；口红前润唇打底。"
};
