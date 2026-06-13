declare module 'vue-virtual-scroller' {
  import { DefineComponent } from 'vue';

  export interface RecycleScrollerProps {
    items: any[];
    itemSize: number;
    keyField?: string;
    gridItems?: number;
    buffer?: number;
  }

  export const RecycleScroller: DefineComponent<RecycleScrollerProps>;
  export const DynamicScroller: DefineComponent<any>;
  export const DynamicScrollerItem: DefineComponent<any>;
}
