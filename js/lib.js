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

// The propose of this file is to unificate and deduplicate
// javascript code that repeats itself in several files.

function getMangaMirror(mirror) {
    "use strict";
    var i;
    for (i = 0; i < mirrors.length; i += 1) {
        if (mirrors[i].mirrorName === mirror) {
            return mirrors[i];
        }
    }
    return null;
}
