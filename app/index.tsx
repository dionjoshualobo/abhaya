import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const GAP = 12;
const BTN_SIZE = (width - GAP * 5) / 4;

const SECRET_CODE = '2580';

type BtnType = 'number' | 'operator' | 'action' | 'equals';

interface Btn {
  label: string;
  type: BtnType;
  wide?: boolean;
}

const BUTTONS: Btn[][] = [
  [
    { label: 'AC', type: 'action' },
    { label: '+/-', type: 'action' },
    { label: '%', type: 'action' },
    { label: '÷', type: 'operator' },
  ],
  [
    { label: '7', type: 'number' },
    { label: '8', type: 'number' },
    { label: '9', type: 'number' },
    { label: '×', type: 'operator' },
  ],
  [
    { label: '4', type: 'number' },
    { label: '5', type: 'number' },
    { label: '6', type: 'number' },
    { label: '-', type: 'operator' },
  ],
  [
    { label: '1', type: 'number' },
    { label: '2', type: 'number' },
    { label: '3', type: 'number' },
    { label: '+', type: 'operator' },
  ],
  [
    { label: '0', type: 'number', wide: true },
    { label: '.', type: 'number' },
    { label: '=', type: 'equals' },
  ],
];

// Simple left-to-right expression evaluator (no eval)
function calculate(expr: string): number {
  const tokens = expr.match(/(\d+\.?\d*|[+\-×÷])/g);
  if (!tokens || tokens.length === 0) return NaN;

  let result = parseFloat(tokens[0]);
  for (let i = 1; i + 1 < tokens.length; i += 2) {
    const op = tokens[i];
    const next = parseFloat(tokens[i + 1]);
    if (isNaN(next)) break;
    if (op === '+') result += next;
    else if (op === '-') result -= next;
    else if (op === '×') result *= next;
    else if (op === '÷') result = next !== 0 ? result / next : NaN;
  }
  return result;
}

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return 'Error';
  return String(parseFloat(n.toPrecision(10)));
}

export default function CalculatorScreen() {
  const router = useRouter();

  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState('0');
  const [justEvaled, setJustEvaled] = useState(false);

  const isOperator = (ch: string) => ['+', '-', '×', '÷'].includes(ch);
  const lastChar = (s: string) => s[s.length - 1] ?? '';

  function handlePress(label: string) {
    // AC
    if (label === 'AC') {
      setExpression('');
      setDisplay('0');
      setJustEvaled(false);
      return;
    }

    // +/-
    if (label === '+/-') {
      if (display === '0' || display === 'Error') return;
      const toggled = display.startsWith('-') ? display.slice(1) : '-' + display;
      setDisplay(toggled);
      setExpression(toggled);
      setJustEvaled(false);
      return;
    }

    // %
    if (label === '%') {
      const val = parseFloat(display);
      if (!isNaN(val)) {
        const pct = formatNumber(val / 100);
        setDisplay(pct);
        setExpression(pct);
      }
      setJustEvaled(false);
      return;
    }

    // =
    if (label === '=') {
      // Secret unlock
      if (expression === SECRET_CODE) {
        router.push('/home');
        return;
      }
      if (expression === '') return;

      const cleanExpr = isOperator(lastChar(expression))
        ? expression.slice(0, -1)
        : expression;

      const result = calculate(cleanExpr);
      const resultStr = formatNumber(result);
      setDisplay(resultStr);
      setExpression(resultStr);
      setJustEvaled(true);
      return;
    }

    // Operator
    if (isOperator(label)) {
      setJustEvaled(false);
      if (expression === '') {
        setExpression('0' + label);
        setDisplay(label);
        return;
      }
      if (isOperator(lastChar(expression))) {
        const newExpr = expression.slice(0, -1) + label;
        setExpression(newExpr);
        setDisplay(label);
        return;
      }
      setExpression(expression + label);
      setDisplay(label);
      return;
    }

    // Digit / Decimal
    if (justEvaled) {
      const fresh = label === '.' ? '0.' : label;
      setExpression(fresh);
      setDisplay(fresh);
      setJustEvaled(false);
      return;
    }

    const parts = expression.split(/[+\-×÷]/);
    const currentPart = parts[parts.length - 1];

    if (label === '.' && currentPart.includes('.')) return;

    // Prevent leading zeros
    if (label !== '.' && currentPart === '0' && !isOperator(lastChar(expression))) {
      const newExpr = expression.slice(0, -1) + label;
      setExpression(newExpr);
      const p = newExpr.split(/[+\-×÷]/);
      setDisplay(p[p.length - 1]);
      setJustEvaled(false);
      return;
    }

    const newExpr = expression === '' && label === '.' ? '0.' : expression + label;
    setExpression(newExpr);
    const p = newExpr.split(/[+\-×÷]/);
    setDisplay(p[p.length - 1] || '0');
    setJustEvaled(false);
  }

  const exprLine = expression !== '' && !justEvaled ? expression : '';

  function getBtnStyle(btn: Btn) {
    switch (btn.type) {
      case 'action':   return styles.btnAction;
      case 'operator': return styles.btnOperator;
      case 'equals':   return styles.btnEquals;
      default:         return styles.btnNumber;
    }
  }

  function getBtnTextStyle(btn: Btn) {
    return btn.type === 'action' ? styles.btnTextDark : styles.btnText;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>

        {/* Display */}
        <View style={styles.displayArea}>
          <Text style={styles.exprText} numberOfLines={1} adjustsFontSizeToFit>
            {exprLine}
          </Text>
          <Text
            style={styles.mainText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
          >
            {display}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.grid}>
          {BUTTONS.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((btn) => (
                <TouchableOpacity
                  key={btn.label}
                  onPress={() => handlePress(btn.label)}
                  style={[
                    styles.btn,
                    getBtnStyle(btn),
                    btn.wide && styles.btnWide,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={getBtnTextStyle(btn)}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  displayArea: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    alignItems: 'flex-end',
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  exprText: {
    fontSize: 22,
    color: '#8a8a8a',
    marginBottom: 2,
  },
  mainText: {
    fontSize: 72,
    fontWeight: '300',
    color: '#fff',
  },
  grid: {
    paddingHorizontal: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  btn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWide: {
    width: BTN_SIZE * 2 + GAP,
    borderRadius: BTN_SIZE / 2,
    paddingLeft: 28,
    alignItems: 'flex-start',
  },
  btnNumber: {
    backgroundColor: '#333333',
  },
  btnAction: {
    backgroundColor: '#a5a5a5',
  },
  btnOperator: {
    backgroundColor: '#ff9f0a',
  },
  btnEquals: {
    backgroundColor: '#c0392b',
  },
  btnText: {
    fontSize: 32,
    fontWeight: '400',
    color: '#fff',
  },
  btnTextDark: {
    fontSize: 32,
    fontWeight: '400',
    color: '#000',
  },
});
