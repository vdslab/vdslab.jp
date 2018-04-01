import React from 'react'
import {Head} from '../head'

export const Top = () => <div>
  <Head subtitle='Top' />
  <div className='tile is-ancestor'>
    <div className='tile is-vertical is-8'>
      <div className='tile is-parent'>
        <article className='tile is-child'>
          <div className='content'>
            <h2>About</h2>
            <p>
              日本大学文理学部情報科学科 尾上研究室(vdslab)のWebサイトです。
              本研究室では、情報可視化とデータサイエンス(VDS; Visualization and Data Science)を中心テーマに研究開発を行います。
              大量で複雑なデータを闇雲に可視化・分析しても問題解決には役立ちません。
              可視化を通じて現実の問題に対して「深い洞察」を与えるような人とデータの対話を目指します。
            </p>
          </div>
        </article>
      </div>
      <div className='tile is-parent'>
        <article className='tile is-child'>
          <div className='content'>
            <h2>News</h2>
            <div>
              準備中
            </div>
          </div>
        </article>
      </div>
    </div>
    <div className='tile is-parent'>
      <article className='tile is-child'>
        <div className='content'>
          <h2>Links</h2>
          <ul>
            <li><a href='http://www.nihon-u.ac.jp/'>日本大学</a></li>
            <li><a href='https://www.chs.nihon-u.ac.jp/'>日本大学 文理学部</a></li>
            <li><a href='http://www.is.chs.nihon-u.ac.jp/'>日本大学 文理学部 情報科学科</a></li>
          </ul>
        </div>
      </article>
    </div>
  </div>
</div>
