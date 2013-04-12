/**

This file is part of All Mangas Reader.

All Mangas Reader is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

All Mangas Reader is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with All Mangas Reader.  If not, see <http://www.gnu.org/licenses/>.

 */

/**
 * Contains utils function...
 */
var MgUtil = {
  /**
   * Sort mirrors list according to user's most used mirrors
   */
  sortMirrors : function (mirrors, mangas) {
    "use strict";
    var i;
    if (mangas !== undefined) {
      $.each(mangas, function (index, value) {
        for (i = 0; i < mirrors.length; i += 1) {
          if (value.mirror === mirrors[i].mirrorName) {
            if (mirrors[i].nb) {
              mirrors[i].nb += 1;
            } else {
              mirrors[i].nb = 1;
            }
            break;
          }
        }
      });
    }
    mirrors.sort(function (a, b) {
      if (a.nb === undefined && b.nb === undefined) {
        return ((a.mirrorName < b.mirrorName) ? -1 : 1);
      }
      if (a.nb === undefined) {
        return 1;
      }
      if (b.nb === undefined) {
        return -1;
      }
      return (a.nb < b.nb) ? 1 : ((a.nb === b.nb) ? ((a.mirrorName < b.mirrorName) ? -1 : 1) : -1);
    });
    return mirrors;
  },

  /**
   * Sort mirrors list according to user's most used mirrors
   */
  getUnusedNames : function (mirrors, mangas) {
    "use strict";
    var i;
    if (mangas !== undefined) {
      $.each(mangas, function (index, value) {
        for (i = 0; i < mirrors.length; i += 1) {
          if (value.mirror === mirrors[i].mirrorName) {
            if (mirrors[i].nb) {
              mirrors[i].nb += 1;
            } else {
              mirrors[i].nb = 1;
            }
            break;
          }
        }
      });
    }
    var unused = [];
    if (mirrors !== undefined) {
      $.each(mirrors, function (index, value) {
        if (value.nb === undefined) {
          unused[unused.length] = value.mirrorName;
        }
      });
    }
    return unused;
  },
  /**
   * Returns a select containing AMR's supported languages (scans languages)
   */
  getLanguageSelect : function (mirrors) {
    "use strict";
    var lst = MgUtil.getLanguageList(mirrors);
    lst.sort(function (a, b) {
      return (a.language < b.language) ? -1 : 1;
    });

    var sel = $("<select><option value='all' selected='true'>All languages</option></select>");

    $.each(lst, function (index, value) {
      $("<option value='" + value.code + "'>" + value.language + "</option>").appendTo(sel);
    });

    return sel;
  },

  /**
   * Returns AMR's supported languages list (scans languages)
   */
  getLanguageList : function (mirrors) {
    "use strict";
    var langs = [];
    if (mirrors !== undefined) {
      $.each(mirrors, function (index, value) {
        var l = (value.languages ? value.languages.split(",") : []);

        $.each(l, function (index, lang) {
          var isFound = false,
            i;
          for (i = 0; i < langs.length; i += 1) {
            if (langs[i].code === lang) {
              isFound = true;
            }
          }
          if (!isFound) {
            langs[langs.length] = {
              'code' : lang,
              'language' : MgUtil.getLanguageName(lang)
            };
          }
        });
      });
    }
    return langs;
  },

  /**
   * Returns the name of a language from its code
   */
  getLanguageName : function (code) {
    "use strict";
    var lang;
    if (MgUtil.languages !== undefined) {
      $.each(MgUtil.languages, function (index, value) {
        if (code === value.code) {
          lang = value.language;
        }
      });
    }
    return lang;
  },

  /**
   * Returns list of web site in the language
   */
  getMirrorsFromLocale : function (mirrors, langCode) {
    "use strict";
    var res = [];
    $.each(mirrors, function (index, value) {
      var l = (value.languages ? value.languages.split(",") : []);
      $.each(l, function (index, lang) {
        if (langCode === lang) {
          res[res.length] = value.mirrorName;
        }
      });
    });
    return res;
  },

  /**
   * List of languages
   */
  languages : [{
    'code' : 'af',
    'language' : 'Afrikaans'
  }, {
    'code' : 'sq',
    'language' : 'Albanian'
  }, {
    'code' : 'ar',
    'language' : 'Arabic'
  }, {
    'code' : 'be',
    'language' : 'Belarusian'
  }, {
    'code' : 'bg',
    'language' : 'Bulgarian'
  }, {
    'code' : 'ca',
    'language' : 'Catalan'
  }, {
    'code' : 'zh',
    'language' : 'Chinese'
  }, {
    'code' : 'zh-CN',
    'language' : 'Chinese Simplified'
  }, {
    'code' : 'zh-TW',
    'language' : 'Chinese Traditional'
  }, {
    'code' : 'hr',
    'language' : 'Croatian'
  }, {
    'code' : 'cs',
    'language' : 'Czech'
  }, {
    'code' : 'da',
    'language' : 'Danish'
  }, {
    'code' : 'nl',
    'language' : 'Dutch'
  }, {
    'code' : 'en',
    'language' : 'English'
  }, {
    'code' : 'et',
    'language' : 'Estonian'
  }, {
    'code' : 'tl',
    'language' : 'Filipino'
  }, {
    'code' : 'fi',
    'language' : 'Finnish'
  }, {
    'code' : 'fr',
    'language' : 'French'
  }, {
    'code' : 'gl',
    'language' : 'Galician'
  }, {
    'code' : 'de',
    'language' : 'German'
  }, {
    'code' : 'el',
    'language' : 'Greek'
  }, {
    'code' : 'ht',
    'language' : 'Haitian Creole'
  }, {
    'code' : 'iw',
    'language' : 'Hebrew'
  }, {
    'code' : 'hi',
    'language' : 'Hindi'
  }, {
    'code' : 'hu',
    'language' : 'Hungarian'
  }, {
    'code' : 'is',
    'language' : 'Icelandic'
  }, {
    'code' : 'id',
    'language' : 'Indonesian'
  }, {
    'code' : 'ga',
    'language' : 'Irish'
  }, {
    'code' : 'it',
    'language' : 'Italian'
  }, {
    'code' : 'ja',
    'language' : 'Japanese'
  }, {
    'code' : 'lv',
    'language' : 'Latvian'
  }, {
    'code' : 'lt',
    'language' : 'Lithuanian'
  }, {
    'code' : 'mk',
    'language' : 'Macedonian'
  }, {
    'code' : 'ms',
    'language' : 'Malay'
  }, {
    'code' : 'mt',
    'language' : 'Maltese'
  }, {
    'code' : 'no',
    'language' : 'Norwegian'
  }, {
    'code' : 'fa',
    'language' : 'Persian'
  }, {
    'code' : 'pl',
    'language' : 'Polish'
  }, {
    'code' : 'pt',
    'language' : 'Portuguese'
  }, {
    'code' : 'ro',
    'language' : 'Romanian'
  }, {
    'code' : 'ru',
    'language' : 'Russian'
  }, {
    'code' : 'sr',
    'language' : 'Serbian'
  }, {
    'code' : 'sk',
    'language' : 'Slovak'
  }, {
    'code' : 'sl',
    'language' : 'Slovenian'
  }, {
    'code' : 'es',
    'language' : 'Spanish'
  }, {
    'code' : 'sw',
    'language' : 'Swahili'
  }, {
    'code' : 'sv',
    'language' : 'Swedish'
  }, {
    'code' : 'th',
    'language' : 'Thai'
  }, {
    'code' : 'tr',
    'language' : 'Turkish'
  }, {
    'code' : 'uk',
    'language' : 'Ukrainian'
  }, {
    'code' : 'vi',
    'language' : 'Vietnamese'
  }, {
    'code' : 'cy',
    'language' : 'Welsh'
  }, {
    'code' : 'yi',
    'language' : 'Yiddish'
  }
    ]
};
