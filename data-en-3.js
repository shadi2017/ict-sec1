/* ICT Secondary Curriculum — Units 9-11 English overlay (Grade 10, Term 1) */
window.__EN_UNITS_C = {
  u9l1: {
    goal: "Classify data as quantitative or qualitative.",
    content: `Quantitative data: it can be counted or measured with numbers.
• Continuous: it can take any value (height, temperature).
• Discrete: whole countable values (number of students).

Qualitative data: it describes qualities and is not measured with numbers (colour, city, gender).

Identifying the type of data matters because it determines the method of analysis and the suitable chart.`,
    keyPoints: ["Quantitative = numbers that are counted or measured", "Continuous: any value (temperature/height)", "Discrete: whole values (a count)", "Qualitative = qualities (colour/city)", "The type of data decides how to analyse it"],
    examples: ["Temperature = continuous quantitative data.", "Car colour = qualitative data."],
    practice: "Classify 8 pieces of data from your surroundings as quantitative (continuous/discrete) or qualitative.",
    quiz: [
      { q: "Temperature is an example of:", o: ["Quantitative data", "Qualitative data", "Text only"], why: "It is measured with numbers." },
      { q: "Car colour is an example of:", o: ["Quantitative data", "Qualitative data"], why: "It is a non-numeric quality." }
    ]
  },
  u9l2: {
    goal: "Follow the steps of data analysis to extract a useful pattern.",
    content: `Data analysis is a journey made of steps:
1. Define the question/goal.
2. Collect the data (questionnaire, databases, measuring devices).
3. Clean the data (remove duplicates, fix errors and outliers).
4. Analyse and explore (averages, charts, discovering patterns).
5. Draw conclusions and make a decision.

Example: analysing class grades → average grade ~75 → the best action is more practice on the hardest unit.`,
    keyPoints: ["Start with a clear question", "Collect data from trusted sources", "Clean the data before analysing", "Use averages and charts", "The goal: a useful pattern/decision"],
    examples: ["A student satisfaction questionnaire, then a bar chart of the results.", "Removing empty and duplicate values before calculating."],
    practice: "Design a questionnaire of 5 questions about study habits, and state how you will analyse its results.",
    quiz: [
      { q: "The first step in data analysis:", o: ["Defining the question/goal", "Drawing the chart", "Deleting the data"], why: "There is no analysis without a clear goal." },
      { q: "Cleaning the data includes:", o: ["Removing duplicates and fixing errors", "Adding random data", "Deleting all the data"], why: "Cleaning raises the quality of the results." }
    ]
  },
  u10l1: {
    goal: "Define modelling and list the steps of building a model.",
    content: `Modelling is creating a digital model that represents a real or conceptual system in a simplified form.

Steps of modelling:
1. Define the system and the goal.
2. Define the variables and the relationships between them.
3. Build the model (mathematical or programmatic).
4. Test and verify the accuracy of the model against reality.

Example: a model for plant growth that depends on water and light.`,
    keyPoints: ["Modelling = a simplified digital model of a system", "Define the system, the variables and the relationships", "Build the model, then verify its accuracy", "Example: a model of population/plant growth"],
    examples: ["A weather model that links temperature, humidity and pressure.", "A financial reserve model for a project budget."],
    practice: "Suggest a simple model for the school canteen queue, and define its variables and their relationships.",
    quiz: [
      { q: "Modelling means:", o: ["Creating a digital model that represents a real system", "Destroying the system", "Printing documents"], why: "It is a simplified representation of the system." },
      { q: "After building the model you must:", o: ["Verify its accuracy against reality", "Delete it immediately", "Ignore it"], why: "Verification is an essential step." }
    ]
  },
  u10l2: {
    goal: "Explain the benefits of simulation and give applied examples of it.",
    content: `Simulation is running the model to observe its behaviour under different conditions without testing the real system.

Its benefits: low cost, safety (no risk to the real system), the ability to repeat experiments and change the conditions, and predicting the future.

Its uses: weather forecasting, traffic flow, building design, training pilots, games, and medical experiments.`,
    keyPoints: ["Simulation = running the model to observe behaviour", "Safe, cheap and repeatable", "It predicts the future and tests scenarios", "Used in weather, traffic and training"],
    examples: ["A flight simulator trains a pilot with no danger.", "Simulating the spread of a disease to study prevention."],
    practice: "Mention three situations in which simulation is preferred over a real experiment, and explain why.",
    quiz: [
      { q: "Simulation is used to:", o: ["Observe the behaviour of a model without a real experiment", "Destroy the real system", "Print documents"], why: "Simulation is a safe alternative to experimenting." },
      { q: "One use of simulation is:", o: ["Training pilots", "Cooking food", "Washing clothes"], why: "Simulation is common in training." }
    ]
  },
  u11l1: {
    goal: "Define an algorithm, the three control structures and the flowchart symbols.",
    content: `An algorithm is a method or procedure for solving a problem, and it is represented visually by flowcharts.

The three control structures:
1. Sequential: executing the steps in order.
2. Repeating: repeating something while a condition is checked.
3. Branching: branching according to the condition (yes/no).

Flowchart symbols: oval (start/end), parallelogram (input/output), rectangle (process), diamond (decision/branching), and flow lines with arrows.`,
    keyPoints: ["An algorithm = a procedure for solving a problem", "A flowchart is a visual representation", "The structures: sequential, repeating, branching", "The diamond = decision/branching", "The parallelogram = input/output"],
    examples: ["An algorithm to add two numbers: Start ← Input a, b ← Sum ← Print ← End.", 'The diamond is used for the question "Is the grade ≥ 50?".'],
    practice: "Draw a flowchart for an algorithm that decides whether a number is even or odd.",
    quiz: [
      { q: "An algorithm is:", o: ["A method for solving a specific problem", "A type of computer", "A game"], why: "It is the procedure that solves the problem." },
      { q: "The structure that branches according to a condition:", o: ["Sequential", "Branching", "Repeating"], why: "Branching means deciding between paths." }
    ]
  },
  u11l2: {
    goal: "Write a program that prints, stores values and performs arithmetic operations.",
    content: `The print() function displays text and values on the screen, and text is placed between quotation marks (\" \" or ' ').

A variable is a box for storing data and retrieving it. The assignment operator (=) means "put the right-hand value into the left-hand variable", not "is equal to".

Arithmetic operators: + addition, - subtraction, * multiplication, / division, // integer quotient, % remainder, ** power.`,
    keyPoints: ["print() displays text and values", "A variable stores data", "= means assignment, not equality", "Operators: + - * / // % **", "// gives the quotient and % gives the remainder"],
    examples: ['print("Hello") prints a text.', 'print(10 // 3) prints 3, and print(10 % 3) prints 1.'],
    practice: "Write a program that stores your name and age and prints a welcome sentence with the age after 5 years.",
    code: `# Basics: printing and variables
city = "Cairo"
print("City:", city)
print(2025)

a = 10
b = 3
print("Sum:", a + b)
print("Floor division:", a // b)
print("Remainder:", a % b)
print("Power:", a ** b)

name = "Sara"
age = 15
print(name, "is", age, "years old")
print("In 5 years:", age + 5)`,
    quiz: [
      { q: 'Which program prints "Hello"?', o: ['print("Hello")', 'display("Hello")', 'show("Hello")'], why: "print is the display function in Python." },
      { q: "The // operator in Python gives:", o: ["The remainder", "The integer quotient", "The power"], why: "// is floor division." },
      { q: "The result of 10 % 3 is:", o: ["1", "3", "0"], why: "The remainder of dividing 10 by 3 is 1." }
    ]
  },
  u11l3: {
    goal: "Use the for loop with range to repeat operations.",
    content: `The for loop executes a group of operations repeatedly. range() is used to define the extent of the repetition:
• range(n): from 0 up to n-1.
• range(start, end): from start up to end-1.
• range(start, end, step): with a step increment.

Example: for i in range(0, 4): print(i) prints 0, 1, 2, 3.

The loop can be used to add up a series of numbers or to repeat an operation over a list of elements.`,
    keyPoints: ["for executes code repeatedly", "range(n) goes from 0 to n-1", "The start, the end and the step can be set", "Used for summing and for repeating over lists", "Repetition saves writing long code"],
    examples: ["range(1,6) produces 1..5.", "Summing the numbers from 1 to 5 into a variable."],
    practice: 'Write a program that prints the multiplication table of the number 7 from 1 to 10.',
    code: `# Loops
for i in range(1, 6):
    print("Number:", i)

# Sum the numbers from 1 to 5
total = 0
for i in range(1, 6):
    total = total + i
print("Total:", total)

# 7 times table
for i in range(1, 11):
    print(7, "x", i, "=", 7 * i)`,
    quiz: [
      { q: "range(0, 4) produces:", o: ["0, 1, 2, 3", "1, 2, 3, 4", "0, 1, 2, 3, 4"], why: "range excludes the end of the range." },
      { q: "The repeating loop is used to:", o: ["Repeat an operation several times", "Print once only", "Delete data"], why: "The essence of repetition is repeating." }
    ]
  },
  u11l4: {
    goal: "Create lists and work with their elements using indexing and loops.",
    content: `A list is a group of elements arranged in sequence; each element has an index that starts at 0 (not 1). An element is accessed with list[index], and the index -1 means the last element.

Two-dimensional lists manage data in rows and columns, and an element is accessed with list[i][j]. Today's lesson uses lists horizontally:
• Finding the minimum/maximum.
• Summing the elements.
• Counting with conditions.`,
    keyPoints: ["A list = ordered elements", "The index starts at 0", "Index -1 = the last element", "A two-dimensional list = rows and columns", "You can find the minimum/maximum and sum the values"],
    examples: ["grades[0] is the first grade, grades[-1] is the last grade.", "Going through the list with a for loop to add up the values."],
    practice: "Write a program that finds the largest and the smallest value in a list of grades and prints their average.",
    code: `# Working with lists
grades = [85, 92, 78, 90, 88]
print("First grade:", grades[0])
print("Last grade:", grades[-1])
print("Number of grades:", len(grades))

# Minimum and maximum
min_grade = grades[0]
max_grade = grades[0]
for g in grades:
    if g < min_grade:
        min_grade = g
    if g > max_grade:
        max_grade = g
print("Lowest grade:", min_grade)
print("Highest grade:", max_grade)

# Total and average
total = 0
for g in grades:
    total = total + g
print("Average:", total / len(grades))`,
    quiz: [
      { q: "The index of the first element in a Python list:", o: ["0", "1", "2"], why: "Indexing starts at zero." },
      { q: "grades[-1] gives:", o: ["The first element", "The last element", "An error"], why: "A negative index counts from the end." }
    ]
  },
  u11l5: {
    goal: "Define a function and use if/elif/else.",
    content: `A function is a group of operations described as one coherent unit that can be called and reused.
• Argument: a value passed to the function.
• Return value: the result that is returned.

def defines a user-defined function, while print() is a built-in function.

The conditional if / elif / else branches the execution according to conditions.`,
    keyPoints: ["A function = reusable operations", "def defines a function", "return returns the result", "An argument is passed to the function", "if/elif/else branches according to the condition"],
    examples: ["A circle area function returns 3.14 × r × r.", "Evaluating a grade: ≥90 excellent, ≥75 good, otherwise try again."],
    practice: "Write a function that takes a grade and returns its text evaluation using if/elif/else.",
    code: `# Functions and conditionals
def circle_area(r):
    return 3.14 * r * r

radius = 5
print("Circle area:", circle_area(radius))

score = 85
if score >= 90:
    print("Excellent")
elif score >= 75:
    print("Very good")
elif score >= 50:
    print("Pass")
else:
    print("Needs review")

# A function that returns the bigger of two numbers
def bigger(a, b):
    if a >= b:
        return a
    else:
        return b

print("Bigger:", bigger(12, 7))`,
    quiz: [
      { q: "The keyword def is used to:", o: ["Define a function", "Print text", "Create a variable"], why: "def = define function." },
      { q: 'if score >= 90 prints "Excellent" when:', o: ["The grade is 90 or more", "The grade is less than 90", "Always"], why: "The condition is met at 90 or more." }
    ]
  }
};
